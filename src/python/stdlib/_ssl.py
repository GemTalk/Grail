"""Grail's ``_ssl``: CPython's Modules/_ssl.c, ported to Python over OpenSSL.

WHAT THIS IS.  CPython's ssl.py is vendored unchanged, and everything it asks
of ``_ssl`` is answered here by calling the OpenSSL that GemStone itself ships
and loads (libssl-<version>-64, OpenSSL 3.5 in GemStone 4.0), through the
foreign-function gate ``_grail_openssl``.  Each function below follows the C
function of the same name in _ssl.c (CPython 3.14.4) -- same OpenSSL calls,
same checks, same messages -- so a behaviour question is answered by reading
the C.  Numeric constants are OpenSSL 3's header values.

WHERE IT DIFFERS FROM _ssl.c, ON PURPOSE:

  * A socket-backed connection runs over MEMORY BIOs, not SSL_set_fd().  A
    GemStone gem runs every Python thread as a green thread in one OS thread,
    so letting OpenSSL block in read(2) would stop them all.  Instead this
    module moves the ciphertext itself, through the socket's own recv/send --
    which already know how to wait on GemStone's scheduler and honour the
    socket's timeout.  SSLSocket and SSLObject therefore share one engine;
    they differ only in whether a WANT_READ is satisfied from a socket or
    reported to the caller.
  * The private-key password is handed to OpenSSL's default password
    callback as its passphrase (the userdata pointer), rather than through a
    C callback.  A callable password is called only when the key turns out to
    be encrypted, as in CPython.
  * Callbacks OpenSSL would call back into Python -- SNI, server-side ALPN
    selection, the message callback, the keylog file and PSK -- are not
    available yet.  They need a C function pointer; setting one raises
    NotImplementedError rather than being silently ignored.
"""

import os as _os
import sys as _sys
import time as _time
import weakref as _weakref
import errno as _errno
import warnings as _warnings
import _socket

import _grail_openssl as _C
from _ssl_data import LIB_CODES as _LIB_CODES, ERR_CODES as _ERR_CODES


# ------------------------------------------------------------ the call gate

class _Functions:
    """The OpenSSL functions, as ``L.SSL_new(...)''.  A namespace rather than
    module globals: a Grail module holds at most 255 globals (they are the
    module object's dynamic instance variables), and this binding alone
    declares nearly 200 functions."""

    def __init__(self):
        self._d = {}

    def __getattr__(self, name):
        try:
            return self._d[name]
        except KeyError:
            raise AttributeError(name) from None


L = _Functions()


class _Constants:
    """OpenSSL's own numeric constants (header values), as ``K.SSL_CTRL_MODE''
    -- kept off the module for the reason _Functions gives."""

    def __init__(self):
        object.__setattr__(self, '_d', {})

    def __getattr__(self, name):
        try:
            return self._d[name]
        except KeyError:
            raise AttributeError(name) from None

    def __setattr__(self, name, value):
        self._d[name] = value


K = _Constants()


def _def(pyname, name, restype, *argtypes):
    """Bind one OpenSSL function as L.<pyname>."""
    def call(*args):
        return _C.call(name, restype, argtypes, *args)
    call.__name__ = name
    L._d[pyname] = call


_P, _I, _U, _L, _UL, _S, _V, _CS = ('ptr', 'int32', 'uint32', 'int64',
                                    'uint64', 'char*', 'void', 'const char*')

# errors
_def('ERR_get_error', 'ERR_get_error', _UL)
_def('ERR_peek_last_error', 'ERR_peek_last_error', _UL)
_def('ERR_clear_error', 'ERR_clear_error', _V)
_def('ERR_reason_error_string', 'ERR_reason_error_string', _S, _UL)
# library
_def('OpenSSL_version_num', 'OpenSSL_version_num', _UL)
_def('OpenSSL_version', 'OpenSSL_version', _S, _I)
# methods / contexts
_def('TLS_method', 'TLS_method', _P)
_def('TLS_client_method', 'TLS_client_method', _P)
_def('TLS_server_method', 'TLS_server_method', _P)
_def('SSL_CTX_new', 'SSL_CTX_new', _P, _P)
_def('SSL_CTX_free', 'SSL_CTX_free', _V, _P)
_def('SSL_CTX_ctrl', 'SSL_CTX_ctrl', _L, _P, _I, _L, _P)
_def('SSL_CTX_set_options', 'SSL_CTX_set_options', _UL, _P, _UL)
_def('SSL_CTX_clear_options', 'SSL_CTX_clear_options', _UL, _P, _UL)
_def('SSL_CTX_get_options', 'SSL_CTX_get_options', _UL, _P)
_def('SSL_CTX_set_cipher_list', 'SSL_CTX_set_cipher_list', _I, _P, _CS)
_def('SSL_CTX_set_verify', 'SSL_CTX_set_verify', _V, _P, _I, _P)
_def('SSL_CTX_get_verify_mode', 'SSL_CTX_get_verify_mode', _I, _P)
_def('SSL_CTX_get0_param', 'SSL_CTX_get0_param', _P, _P)
_def('SSL_CTX_get_cert_store', 'SSL_CTX_get_cert_store', _P, _P)
_def('SSL_CTX_use_certificate_chain_file', 'SSL_CTX_use_certificate_chain_file', _I, _P, _CS)
_def('SSL_CTX_use_PrivateKey_file', 'SSL_CTX_use_PrivateKey_file', _I, _P, _CS, _I)
_def('SSL_CTX_check_private_key', 'SSL_CTX_check_private_key', _I, _P)
_def('SSL_CTX_set_default_passwd_cb_userdata', 'SSL_CTX_set_default_passwd_cb_userdata', _V, _P, _P)
_def('SSL_CTX_load_verify_locations', 'SSL_CTX_load_verify_locations', _I, _P, _CS, _CS)
_def('SSL_CTX_set_default_verify_paths', 'SSL_CTX_set_default_verify_paths', _I, _P)
_def('SSL_CTX_set_alpn_protos', 'SSL_CTX_set_alpn_protos', _I, _P, _P, _U)
_def('SSL_CTX_get_security_level', 'SSL_CTX_get_security_level', _I, _P)
_def('SSL_CTX_set_num_tickets', 'SSL_CTX_set_num_tickets', _I, _P, _UL)
_def('SSL_CTX_get_num_tickets', 'SSL_CTX_get_num_tickets', _UL, _P)
_def('SSL_CTX_set_post_handshake_auth', 'SSL_CTX_set_post_handshake_auth', _V, _P, _I)
# verify params
_def('X509_VERIFY_PARAM_set_flags', 'X509_VERIFY_PARAM_set_flags', _I, _P, _UL)
_def('X509_VERIFY_PARAM_clear_flags', 'X509_VERIFY_PARAM_clear_flags', _I, _P, _UL)
_def('X509_VERIFY_PARAM_get_flags', 'X509_VERIFY_PARAM_get_flags', _UL, _P)
_def('X509_VERIFY_PARAM_set_hostflags', 'X509_VERIFY_PARAM_set_hostflags', _V, _P, _U)
_def('X509_VERIFY_PARAM_get_hostflags', 'X509_VERIFY_PARAM_get_hostflags', _U, _P)
_def('X509_VERIFY_PARAM_set1_host', 'X509_VERIFY_PARAM_set1_host', _I, _P, _CS, _UL)
_def('X509_VERIFY_PARAM_set1_ip', 'X509_VERIFY_PARAM_set1_ip', _I, _P, _P, _UL)
# connections
_def('SSL_new', 'SSL_new', _P, _P)
_def('SSL_free', 'SSL_free', _V, _P)
_def('SSL_ctrl', 'SSL_ctrl', _L, _P, _I, _L, _P)
_def('SSL_set_bio', 'SSL_set_bio', _V, _P, _P, _P)
_def('SSL_set_connect_state', 'SSL_set_connect_state', _V, _P)
_def('SSL_set_accept_state', 'SSL_set_accept_state', _V, _P)
_def('SSL_do_handshake', 'SSL_do_handshake', _I, _P)
_def('SSL_read_ex', 'SSL_read_ex', _I, _P, _P, _UL, _P)
_def('SSL_write_ex', 'SSL_write_ex', _I, _P, _P, _UL, _P)
_def('SSL_shutdown', 'SSL_shutdown', _I, _P)
_def('SSL_get_shutdown', 'SSL_get_shutdown', _I, _P)
_def('SSL_set_shutdown', 'SSL_set_shutdown', _V, _P, _I)
_def('SSL_set_read_ahead', 'SSL_set_read_ahead', _V, _P, _I)
_def('SSL_get_error', 'SSL_get_error', _I, _P, _I)
_def('SSL_pending', 'SSL_pending', _I, _P)
_def('SSL_is_init_finished', 'SSL_is_init_finished', _I, _P)
_def('SSL_get_version', 'SSL_get_version', _S, _P)
_def('SSL_get_current_cipher', 'SSL_get_current_cipher', _P, _P)
_def('SSL_get_ciphers', 'SSL_get_ciphers', _P, _P)
_def('SSL_get_client_ciphers', 'SSL_get_client_ciphers', _P, _P)
_def('SSL_get_verify_result', 'SSL_get_verify_result', _L, _P)
_def('SSL_get_verify_mode', 'SSL_get_verify_mode', _I, _P)
_def('SSL_set_verify', 'SSL_set_verify', _V, _P, _I, _P)
_def('SSL_set_post_handshake_auth', 'SSL_set_post_handshake_auth', _V, _P, _I)
_def('SSL_verify_client_post_handshake', 'SSL_verify_client_post_handshake', _I, _P)
_def('SSL_get0_param', 'SSL_get0_param', _P, _P)
_def('SSL_set_session_id_context', 'SSL_set_session_id_context', _I, _P, _P, _U)
_def('SSL_get1_peer_certificate', 'SSL_get1_peer_certificate', _P, _P)
_def('SSL_get_peer_cert_chain', 'SSL_get_peer_cert_chain', _P, _P)
_def('SSL_get0_verified_chain', 'SSL_get0_verified_chain', _P, _P)
_def('SSL_get_SSL_CTX', 'SSL_get_SSL_CTX', _P, _P)
_def('SSL_set_SSL_CTX', 'SSL_set_SSL_CTX', _P, _P, _P)
_def('SSL_get0_alpn_selected', 'SSL_get0_alpn_selected', _V, _P, _P, _P)
_def('SSL_get_finished', 'SSL_get_finished', _UL, _P, _P, _UL)
_def('SSL_get_peer_finished', 'SSL_get_peer_finished', _UL, _P, _P, _UL)
_def('SSL_session_reused', 'SSL_session_reused', _I, _P)
_def('SSL_get1_session', 'SSL_get1_session', _P, _P)
_def('SSL_set_session', 'SSL_set_session', _I, _P, _P)
_def('SSL_get_servername', 'SSL_get_servername', _S, _P, _I)
# ciphers
_def('SSL_CIPHER_get_name', 'SSL_CIPHER_get_name', _S, _P)
_def('SSL_CIPHER_get_version', 'SSL_CIPHER_get_version', _S, _P)
_def('SSL_CIPHER_get_bits', 'SSL_CIPHER_get_bits', _I, _P, _P)
_def('SSL_CIPHER_get_id', 'SSL_CIPHER_get_id', _U, _P)
_def('SSL_CIPHER_description', 'SSL_CIPHER_description', _S, _P, _P, _I)
_def('SSL_CIPHER_is_aead', 'SSL_CIPHER_is_aead', _I, _P)
_def('SSL_CIPHER_get_cipher_nid', 'SSL_CIPHER_get_cipher_nid', _I, _P)
_def('SSL_CIPHER_get_digest_nid', 'SSL_CIPHER_get_digest_nid', _I, _P)
_def('SSL_CIPHER_get_kx_nid', 'SSL_CIPHER_get_kx_nid', _I, _P)
_def('SSL_CIPHER_get_auth_nid', 'SSL_CIPHER_get_auth_nid', _I, _P)
# sessions
_def('SSL_SESSION_free', 'SSL_SESSION_free', _V, _P)
_def('SSL_SESSION_get_id', 'SSL_SESSION_get_id', _P, _P, _P)
_def('SSL_SESSION_get_time_ex', 'SSL_SESSION_get_time_ex', _L, _P)
_def('SSL_SESSION_get_timeout', 'SSL_SESSION_get_timeout', _L, _P)
_def('SSL_SESSION_get_ticket_lifetime_hint', 'SSL_SESSION_get_ticket_lifetime_hint', _UL, _P)
_def('SSL_SESSION_has_ticket', 'SSL_SESSION_has_ticket', _I, _P)
# BIOs
_def('BIO_s_mem', 'BIO_s_mem', _P)
_def('BIO_new', 'BIO_new', _P, _P)
_def('BIO_new_mem_buf', 'BIO_new_mem_buf', _P, _P, _I)
_def('BIO_free', 'BIO_free', _I, _P)
_def('BIO_up_ref', 'BIO_up_ref', _I, _P)
_def('BIO_read', 'BIO_read', _I, _P, _P, _I)
_def('BIO_write', 'BIO_write', _I, _P, _P, _I)
_def('BIO_gets', 'BIO_gets', _I, _P, _P, _I)
_def('BIO_ctrl', 'BIO_ctrl', _L, _P, _I, _L, _P)
_def('BIO_ctrl_pending', 'BIO_ctrl_pending', _UL, _P)
_def('BIO_set_flags', 'BIO_set_flags', _V, _P, _I)
_def('BIO_clear_flags', 'BIO_clear_flags', _V, _P, _I)
# certificates
_def('X509_free', 'X509_free', _V, _P)
_def('X509_up_ref', 'X509_up_ref', _I, _P)
_def('PEM_read_bio_X509', 'PEM_read_bio_X509', _P, _P, _P, _P, _P)
_def('PEM_read_bio_PrivateKey', 'PEM_read_bio_PrivateKey', _P, _P, _P, _P, _P)
_def('PEM_write_bio_X509', 'PEM_write_bio_X509', _I, _P, _P)
_def('PEM_write_bio_X509_AUX', 'PEM_write_bio_X509_AUX', _I, _P, _P)
_def('PEM_read_bio_DHparams', 'PEM_read_bio_DHparams', _P, _P, _P, _P, _P)
_def('DH_free', 'DH_free', _V, _P)
_def('EVP_PKEY_free', 'EVP_PKEY_free', _V, _P)
_def('d2i_X509_bio', 'd2i_X509_bio', _P, _P, _P)
_def('i2d_X509_bio', 'i2d_X509_bio', _I, _P, _P)
_def('X509_get_subject_name', 'X509_get_subject_name', _P, _P)
_def('X509_get_issuer_name', 'X509_get_issuer_name', _P, _P)
_def('X509_get_version', 'X509_get_version', _L, _P)
_def('X509_get_serialNumber', 'X509_get_serialNumber', _P, _P)
_def('X509_get0_notBefore', 'X509_get0_notBefore', _P, _P)
_def('X509_get0_notAfter', 'X509_get0_notAfter', _P, _P)
_def('X509_get_ext_d2i', 'X509_get_ext_d2i', _P, _P, _I, _P, _P)
_def('X509_check_ca', 'X509_check_ca', _I, _P)
_def('X509_cmp', 'X509_cmp', _I, _P, _P)
_def('X509_subject_name_hash', 'X509_subject_name_hash', _UL, _P)
_def('X509_NAME_entry_count', 'X509_NAME_entry_count', _I, _P)
_def('X509_NAME_get_entry', 'X509_NAME_get_entry', _P, _P, _I)
_def('X509_NAME_ENTRY_set', 'X509_NAME_ENTRY_set', _I, _P)
_def('X509_NAME_ENTRY_get_object', 'X509_NAME_ENTRY_get_object', _P, _P)
_def('X509_NAME_ENTRY_get_data', 'X509_NAME_ENTRY_get_data', _P, _P)
_def('X509_NAME_print_ex', 'X509_NAME_print_ex', _I, _P, _P, _I, _UL)
_def('X509_STORE_add_cert', 'X509_STORE_add_cert', _I, _P, _P)
_def('X509_STORE_get1_objects', 'X509_STORE_get1_objects', _P, _P)
_def('X509_OBJECT_get_type', 'X509_OBJECT_get_type', _I, _P)
_def('X509_OBJECT_get0_X509', 'X509_OBJECT_get0_X509', _P, _P)
_def('X509_OBJECT_free', 'X509_OBJECT_free', _V, _P)
_def('X509_verify_cert_error_string', 'X509_verify_cert_error_string', _S, _L)
_def('X509_get_default_cert_file_env', 'X509_get_default_cert_file_env', _S)
_def('X509_get_default_cert_file', 'X509_get_default_cert_file', _S)
_def('X509_get_default_cert_dir_env', 'X509_get_default_cert_dir_env', _S)
_def('X509_get_default_cert_dir', 'X509_get_default_cert_dir', _S)
_def('GENERAL_NAME_print', 'GENERAL_NAME_print', _I, _P, _P)
_def('GENERAL_NAMES_free', 'GENERAL_NAMES_free', _V, _P)
_def('AUTHORITY_INFO_ACCESS_free', 'AUTHORITY_INFO_ACCESS_free', _V, _P)
_def('CRL_DIST_POINTS_free', 'CRL_DIST_POINTS_free', _V, _P)
_def('i2a_ASN1_INTEGER', 'i2a_ASN1_INTEGER', _I, _P, _P)
_def('ASN1_TIME_print', 'ASN1_TIME_print', _I, _P, _P)
_def('ASN1_STRING_type', 'ASN1_STRING_type', _I, _P)
_def('ASN1_STRING_length', 'ASN1_STRING_length', _I, _P)
_def('ASN1_STRING_get0_data', 'ASN1_STRING_get0_data', _P, _P)
_def('ASN1_STRING_to_UTF8', 'ASN1_STRING_to_UTF8', _I, _P, _P)
_def('ASN1_OCTET_STRING_free', 'ASN1_OCTET_STRING_free', _V, _P)
_def('a2i_IPADDRESS', 'a2i_IPADDRESS', _P, _CS)
_def('i2t_ASN1_OBJECT', 'i2t_ASN1_OBJECT', _I, _P, _I, _P)
_def('CRYPTO_free', 'CRYPTO_free', _V, _P, _CS, _I)
# objects
_def('OBJ_obj2txt', 'OBJ_obj2txt', _I, _P, _I, _P, _I)
_def('OBJ_obj2nid', 'OBJ_obj2nid', _I, _P)
_def('OBJ_nid2sn', 'OBJ_nid2sn', _S, _I)
_def('OBJ_nid2ln', 'OBJ_nid2ln', _S, _I)
_def('OBJ_sn2nid', 'OBJ_sn2nid', _I, _CS)
_def('OBJ_txt2obj', 'OBJ_txt2obj', _P, _CS, _I)
_def('OBJ_nid2obj', 'OBJ_nid2obj', _P, _I)
_def('ASN1_OBJECT_free', 'ASN1_OBJECT_free', _V, _P)
# stacks
_def('OPENSSL_sk_num', 'OPENSSL_sk_num', _I, _P)
_def('OPENSSL_sk_value', 'OPENSSL_sk_value', _P, _P, _I)
_def('OPENSSL_sk_free', 'OPENSSL_sk_free', _V, _P)
# random
_def('RAND_bytes_', 'RAND_bytes', _I, _P, _I)
_def('RAND_add_', 'RAND_add', _V, _P, _I, 'double')
_def('RAND_status_', 'RAND_status', _I)


# ------------------------------------------------------------ constants
# OpenSSL 3 header values (openssl/ssl.h, bio.h, x509v3.h, obj_mac.h, err.h)

K.SSL_CTRL_MODE = 33
K.SSL_CTRL_SET_TMP_DH = 3
K.SSL_CTRL_SET_TLSEXT_HOSTNAME = 55
K.SSL_CTRL_SET_MIN_PROTO_VERSION = 123
K.SSL_CTRL_SET_MAX_PROTO_VERSION = 124
K.SSL_CTRL_GET_MIN_PROTO_VERSION = 130
K.SSL_CTRL_GET_MAX_PROTO_VERSION = 131
K.SSL_CTRL_SET_GROUPS_LIST = 92
K.SSL_CTRL_SESS = {'number': 20, 'connect': 21, 'connect_good': 22,
                  'connect_renegotiate': 23, 'accept': 24, 'accept_good': 25,
                  'accept_renegotiate': 26, 'hits': 27, 'misses': 29,
                  'timeouts': 30, 'cache_full': 31}
K.SSL_MODE_ACCEPT_MOVING_WRITE_BUFFER = 0x2
K.SSL_MODE_AUTO_RETRY = 0x4
K.SSL_MODE_RELEASE_BUFFERS = 0x10
_TLSEXT_NAMETYPE_host_name = 0
K.SSL_VERIFY_NONE = 0x00
K.SSL_VERIFY_PEER = 0x01
K.SSL_VERIFY_FAIL_IF_NO_PEER_CERT = 0x02
K.SSL_VERIFY_POST_HANDSHAKE = 0x08
K.SSL_SENT_SHUTDOWN = 1
K.SSL_RECEIVED_SHUTDOWN = 2
K.SSL_FILETYPE_PEM = 1
K.SSL_FILETYPE_ASN1 = 2
K.BIO_CTRL_RESET = 1
K.BIO_CTRL_EOF = 2
K.BIO_C_SET_BUF_MEM_EOF_RETURN = 130
K.BIO_FLAGS_READ = 0x01
K.BIO_FLAGS_RWS = 0x07
K.BIO_FLAGS_SHOULD_RETRY = 0x08
K.GEN_OTHERNAME, K.GEN_EMAIL, K.GEN_DNS, K.GEN_X400, K.GEN_DIRNAME = 0, 1, 2, 3, 4
K.GEN_EDIPARTY, K.GEN_URI, K.GEN_IPADD, K.GEN_RID = 5, 6, 7, 8
_NID_undef = 0
_NID_subject_alt_name = 85
_NID_crl_distribution_points = 103
_NID_info_access = 177
_NID_ad_OCSP = 178
_NID_ad_ca_issuers = 179
K.V_ASN1_BIT_STRING = 3
K.X509_LU_X509 = 1
K.X509_LU_CRL = 2
K.XN_FLAG_RFC2253 = 17892119
K.X509_V_ERR_HOSTNAME_MISMATCH = 62
K.X509_V_ERR_IP_ADDRESS_MISMATCH = 64
K.X509_V_FLAG_TRUSTED_FIRST = 0x8000
K.X509_CHECK_FLAG_NO_PARTIAL_WILDCARDS = 0x4
K.ERR_LIB_SYS = 2
K.ERR_LIB_PEM = 9
K.ERR_LIB_X509 = 11
K.ERR_LIB_SSL = 20
K.SSL_R_CERTIFICATE_VERIFY_FAILED = 134
K.SSL_R_UNEXPECTED_EOF_WHILE_READING = 294
K.X509_R_CERT_ALREADY_IN_HASH_TABLE = 101
K.PEM_R_NO_START_LINE = 108
K.PEM_R_BAD_PASSWORD_READ = 104
K.PEM_BUFSIZE = 1024
K.OPENSSL_NPN_NEGOTIATED = 1


def _err_lib(e):
    if e & 0x80000000:
        return K.ERR_LIB_SYS
    return (e >> 23) & 0xFF


def _err_reason(e):
    if e & 0x80000000:
        return e & 0x7FFFFFFF
    return e & 0x7FFFFF


# _ssl's own constants -- same names and values as CPython's module
_DEFAULT_CIPHERS = ('@SECLEVEL=2:ECDH+AESGCM:ECDH+CHACHA20:ECDH+AES:DHE+AES:'
                    '!aNULL:!eNULL:!aDSS:!SHA1:!AESCCM')

SSL_ERROR_ZERO_RETURN = 6
SSL_ERROR_WANT_READ = 2
SSL_ERROR_WANT_WRITE = 3
SSL_ERROR_WANT_X509_LOOKUP = 4
SSL_ERROR_SYSCALL = 5
SSL_ERROR_SSL = 1
SSL_ERROR_WANT_CONNECT = 7
SSL_ERROR_EOF = 8
SSL_ERROR_INVALID_ERROR_CODE = 10
K.PY_SSL_ERROR_NONE = 0
K.PY_SSL_ERROR_NO_SOCKET = 9

CERT_NONE = 0
CERT_OPTIONAL = 1
CERT_REQUIRED = 2

VERIFY_DEFAULT = 0
VERIFY_CRL_CHECK_LEAF = 0x4
VERIFY_CRL_CHECK_CHAIN = 0x4 | 0x8
VERIFY_X509_STRICT = 0x20
VERIFY_ALLOW_PROXY_CERTS = 0x40
VERIFY_X509_TRUSTED_FIRST = 0x8000
VERIFY_X509_PARTIAL_CHAIN = 0x80000

ALERT_DESCRIPTION_CLOSE_NOTIFY = 0
ALERT_DESCRIPTION_UNEXPECTED_MESSAGE = 10
ALERT_DESCRIPTION_BAD_RECORD_MAC = 20
ALERT_DESCRIPTION_RECORD_OVERFLOW = 22
ALERT_DESCRIPTION_DECOMPRESSION_FAILURE = 30
ALERT_DESCRIPTION_HANDSHAKE_FAILURE = 40
ALERT_DESCRIPTION_BAD_CERTIFICATE = 42
ALERT_DESCRIPTION_UNSUPPORTED_CERTIFICATE = 43
ALERT_DESCRIPTION_CERTIFICATE_REVOKED = 44
ALERT_DESCRIPTION_CERTIFICATE_EXPIRED = 45
ALERT_DESCRIPTION_CERTIFICATE_UNKNOWN = 46
ALERT_DESCRIPTION_ILLEGAL_PARAMETER = 47
ALERT_DESCRIPTION_UNKNOWN_CA = 48
ALERT_DESCRIPTION_ACCESS_DENIED = 49
ALERT_DESCRIPTION_DECODE_ERROR = 50
ALERT_DESCRIPTION_DECRYPT_ERROR = 51
ALERT_DESCRIPTION_PROTOCOL_VERSION = 70
ALERT_DESCRIPTION_INSUFFICIENT_SECURITY = 71
ALERT_DESCRIPTION_INTERNAL_ERROR = 80
ALERT_DESCRIPTION_USER_CANCELLED = 90
ALERT_DESCRIPTION_NO_RENEGOTIATION = 100
ALERT_DESCRIPTION_UNSUPPORTED_EXTENSION = 110
ALERT_DESCRIPTION_CERTIFICATE_UNOBTAINABLE = 111
ALERT_DESCRIPTION_UNRECOGNIZED_NAME = 112
ALERT_DESCRIPTION_BAD_CERTIFICATE_STATUS_RESPONSE = 113
ALERT_DESCRIPTION_BAD_CERTIFICATE_HASH_VALUE = 114
ALERT_DESCRIPTION_UNKNOWN_PSK_IDENTITY = 115

PROTOCOL_SSLv23 = 2
PROTOCOL_TLS = 2
PROTOCOL_TLS_CLIENT = 16
PROTOCOL_TLS_SERVER = 17
PROTOCOL_TLSv1 = 3
PROTOCOL_TLSv1_1 = 4
PROTOCOL_TLSv1_2 = 5
K.PY_SSL_VERSION_SSL3 = 1

OP_ALL = 0x80000850 & ~0x800
OP_NO_SSLv2 = 0
OP_NO_SSLv3 = 1 << 25
OP_NO_TLSv1 = 1 << 26
OP_NO_TLSv1_1 = 1 << 28
OP_NO_TLSv1_2 = 1 << 27
OP_NO_TLSv1_3 = 1 << 29
OP_CIPHER_SERVER_PREFERENCE = 1 << 22
OP_SINGLE_DH_USE = 0
OP_NO_TICKET = 1 << 14
OP_LEGACY_SERVER_CONNECT = 1 << 2
OP_SINGLE_ECDH_USE = 0
OP_NO_COMPRESSION = 1 << 17
OP_ENABLE_MIDDLEBOX_COMPAT = 1 << 20
OP_NO_RENEGOTIATION = 1 << 30
OP_IGNORE_UNEXPECTED_EOF = 1 << 7
OP_ENABLE_KTLS = 1 << 3

HOSTFLAG_ALWAYS_CHECK_SUBJECT = 0x1
HOSTFLAG_NEVER_CHECK_SUBJECT = 0x20
HOSTFLAG_NO_WILDCARDS = 0x2
HOSTFLAG_NO_PARTIAL_WILDCARDS = 0x4
HOSTFLAG_MULTI_LABEL_WILDCARDS = 0x8
HOSTFLAG_SINGLE_LABEL_SUBDOMAINS = 0x10

ENCODING_PEM = 1
ENCODING_DER = 2
K.ENCODING_PEM_AUX = 0x101

PROTO_MINIMUM_SUPPORTED = -2
PROTO_MAXIMUM_SUPPORTED = -1
PROTO_SSLv3 = 0x300
PROTO_TLSv1 = 0x301
PROTO_TLSv1_1 = 0x302
PROTO_TLSv1_2 = 0x303
PROTO_TLSv1_3 = 0x304
K.PY_PROTO_MINIMUM_AVAILABLE = PROTO_SSLv3
K.PY_PROTO_MAXIMUM_AVAILABLE = PROTO_TLSv1_3
K.PY_SSL_MIN_PROTOCOL = PROTO_TLSv1_2

HAS_SNI = True
HAS_TLS_UNIQUE = True
HAS_ECDH = True
HAS_NPN = False
HAS_ALPN = True
HAS_SSLv2 = False
HAS_SSLv3 = False
HAS_TLSv1 = True
HAS_TLSv1_1 = True
HAS_TLSv1_2 = True
HAS_TLSv1_3 = True
HAS_PSK = True
HAS_PHA = True


def _parse_openssl_version(libver):
    status = libver & 0xF
    libver >>= 4
    patch = libver & 0xFF
    libver >>= 8
    fix = libver & 0xFF
    libver >>= 8
    minor = libver & 0xFF
    libver >>= 8
    major = libver & 0xFF
    return (major, minor, fix, patch, status)


OPENSSL_VERSION_NUMBER = L.OpenSSL_version_num()
OPENSSL_VERSION_INFO = _parse_openssl_version(OPENSSL_VERSION_NUMBER)
OPENSSL_VERSION = L.OpenSSL_version(0).decode('ascii')
# The API the binding is written against is the library's own: there is no
# separate header set this module was compiled with.
_OPENSSL_API_VERSION = OPENSSL_VERSION_INFO


# ------------------------------------------------------------ exceptions

class SSLError(OSError):
    """An error occurred in the SSL implementation."""

    def __str__(self):
        if isinstance(self.strerror, str):
            return self.strerror
        return str(self.args)


class SSLCertVerificationError(SSLError, ValueError):
    """A certificate could not be verified."""


class SSLZeroReturnError(SSLError):
    """SSL/TLS session closed cleanly."""


class SSLWantReadError(SSLError):
    """Non-blocking SSL socket needs to read more data
before the requested operation can be completed."""


class SSLWantWriteError(SSLError):
    """Non-blocking SSL socket needs to write more data
before the requested operation can be completed."""


class SSLSyscallError(SSLError):
    """System error when attempting SSL operation."""


class SSLEOFError(SSLError):
    """SSL/TLS connection terminated abruptly."""


for _cls in (SSLError, SSLCertVerificationError, SSLZeroReturnError,
             SSLWantReadError, SSLWantWriteError, SSLSyscallError,
             SSLEOFError):
    _cls.__module__ = 'ssl'
del _cls


def _cstr(b):
    return None if b is None else b.decode('utf-8', 'replace')


def _fill_and_make(type_, ssl_errno, errstr, lineno, errcode, sslsock=None):
    """fill_and_set_sslerror(), answering the exception instead of setting it."""
    reason_obj = lib_obj = None
    if errcode:
        lib, reason = _err_lib(errcode), _err_reason(errcode)
        reason_obj = _ERR_CODES.get((lib, reason))
        lib_obj = _LIB_CODES.get(lib)
        if errstr is None:
            errstr = _cstr(L.ERR_reason_error_string(errcode))
    verify_obj = verify_code = None
    if sslsock is not None and type_ is SSLCertVerificationError:
        verify_code = L.SSL_get_verify_result(sslsock._ssl)
        if verify_code == K.X509_V_ERR_HOSTNAME_MISMATCH:
            verify_obj = ("Hostname mismatch, certificate is not valid for "
                          "'%s'." % sslsock.server_hostname)
        elif verify_code == K.X509_V_ERR_IP_ADDRESS_MISMATCH:
            verify_obj = ("IP address mismatch, certificate is not valid for "
                          "'%s'." % sslsock.server_hostname)
        else:
            verify_obj = _cstr(L.X509_verify_cert_error_string(verify_code))
    msg = ''
    if lib_obj:
        msg += '[%s' % lib_obj
        if reason_obj:
            msg += ': %s' % reason_obj
        msg += '] '
    if errstr:
        msg += errstr
    else:
        msg += 'unknown error (0x%x)' % errcode
    if verify_obj:
        msg += ': %s' % verify_obj
    msg += ' (_ssl.c:%d)' % lineno
    err = type_(_err_reason(ssl_errno), msg)
    err.reason = reason_obj
    err.library = lib_obj
    if sslsock is not None and type_ is SSLCertVerificationError:
        err.verify_code = verify_code
        err.verify_message = verify_obj
    return err


def _ssl_error(errstr=None, lineno=0):
    """_setSSLError(): an SSLError from the queue's last error (or errstr)."""
    errcode = L.ERR_peek_last_error() if errstr is None else 0
    err = _fill_and_make(SSLError, errcode, errstr, lineno, errcode)
    L.ERR_clear_error()
    return err


# ------------------------------------------------------------ small helpers

def _bio_bytes(bio):
    """The whole content of a memory BIO."""
    n = L.BIO_ctrl_pending(bio)
    if n == 0:
        return b''
    buf = _C.malloc(n)
    got = L.BIO_read(bio, buf, n)
    return _C.read(buf, 0, max(got, 0))


def _bio_line(bio):
    """L.BIO_gets() of up to 2047 bytes, as the C reads a 2048 buffer."""
    buf = _C.malloc(2048)
    n = L.BIO_gets(bio, buf, 2047)
    if n < 0:
        raise _ssl_error()
    return _C.read(buf, 0, n)


def _new_mem_bio():
    bio = L.BIO_new(L.BIO_s_mem())
    if bio is None:
        raise MemoryError('failed to allocate BIO')
    return bio


def _asn1_string_bytes(s):
    n = L.ASN1_STRING_length(s)
    if n <= 0:
        return b''
    return _C.read(L.ASN1_STRING_get0_data(s), 0, n)


def _openssl_free(p):
    L.CRYPTO_free(p, '_ssl.py', 0)


def _fsencode_path(path, what):
    try:
        return _os.fsencode(path)
    except TypeError:
        raise TypeError('%s should be a valid filesystem path' % what) from None


def _check_readable(path_bytes):
    """What SSL_CTX_*_file() reports through errno, raised first: a missing
    or unreadable file is an OSError carrying the errno, as CPython's
    ``errno != 0'' branch gives it.  (There is no C errno to read here.)"""
    try:
        # Opened by the DECODED name: Grail's open() takes a str path.
        with open(_os.fsdecode(path_bytes), 'rb'):
            pass
    except OSError as e:
        raise OSError(e.errno, e.strerror) from None


# ------------------------------------------------------------ certificates

def _asn1obj2py(obj, no_name):
    buf = _C.malloc(256)
    n = L.OBJ_obj2txt(buf, 256, obj, no_name)
    if n < 0:
        raise _ssl_error()
    if n > 255:
        n2 = L.OBJ_obj2txt(None, 0, obj, no_name)
        buf = _C.malloc(n2 + 1)
        n = L.OBJ_obj2txt(buf, n2 + 1, obj, no_name)
        if n < 0:
            raise _ssl_error()
    if not n and no_name:
        return None
    return _C.read(buf, 0, n).decode('utf-8', 'surrogateescape')


def _create_tuple_for_attribute(name, value):
    pyname = _asn1obj2py(name, 0)
    if L.ASN1_STRING_type(value) == K.V_ASN1_BIT_STRING:
        return (pyname, _asn1_string_bytes(value))
    out = _C.malloc(8)
    n = L.ASN1_STRING_to_UTF8(out, value)
    if n < 0:
        raise _ssl_error()
    p = _C.read_ptr(out, 0)
    text = _C.read(p, 0, n).decode('utf-8', 'surrogateescape') if n else ''
    _openssl_free(p)
    return (pyname, text)


def _create_tuple_for_X509_NAME(xname):
    dn = []
    rdn = []
    rdn_level = -1
    for i in range(L.X509_NAME_entry_count(xname)):
        entry = L.X509_NAME_get_entry(xname, i)
        if rdn_level >= 0 and rdn_level != L.X509_NAME_ENTRY_set(entry):
            dn.append(tuple(rdn))
            rdn = []
        rdn_level = L.X509_NAME_ENTRY_set(entry)
        rdn.append(_create_tuple_for_attribute(
            L.X509_NAME_ENTRY_get_object(entry), L.X509_NAME_ENTRY_get_data(entry)))
    if rdn:
        dn.append(tuple(rdn))
    return tuple(dn)


def _gn_type(gn):
    return _C.read_int(gn, 0, 4, True)


def _gn_value(gn):
    return _C.read_ptr(gn, 8)


def _get_peer_alt_names(cert):
    names = L.X509_get_ext_d2i(cert, _NID_subject_alt_name, None, None)
    if names is None:
        return None
    result = []
    bio = _new_mem_bio()
    try:
        for j in range(L.OPENSSL_sk_num(names)):
            name = L.OPENSSL_sk_value(names, j)
            gntype = _gn_type(name)
            if gntype == K.GEN_DIRNAME:
                result.append(('DirName', _create_tuple_for_X509_NAME(_gn_value(name))))
            elif gntype in (K.GEN_EMAIL, K.GEN_DNS, K.GEN_URI):
                label = {K.GEN_EMAIL: 'email', K.GEN_DNS: 'DNS', K.GEN_URI: 'URI'}[gntype]
                result.append((label, _asn1_string_bytes(_gn_value(name)).decode(
                    'utf-8', 'surrogateescape')))
            elif gntype == K.GEN_RID:
                buf = _C.malloc(2048)
                n = L.i2t_ASN1_OBJECT(buf, 2047, _gn_value(name))
                if n < 0:
                    raise _ssl_error()
                value = '<INVALID>' if n >= 2048 else _C.read(buf, 0, n).decode('utf-8', 'replace')
                result.append(('Registered ID', value))
            elif gntype == K.GEN_IPADD:
                ip = _asn1_string_bytes(_gn_value(name))
                if len(ip) == 4:
                    value = '%d.%d.%d.%d' % tuple(ip)
                elif len(ip) == 16:
                    value = ':'.join('%X' % (ip[i] << 8 | ip[i + 1]) for i in range(0, 16, 2))
                else:
                    value = '<invalid>'
                result.append(('IP Address', value))
            else:
                if gntype not in (K.GEN_OTHERNAME, K.GEN_X400, K.GEN_EDIPARTY, K.GEN_RID):
                    _warnings.warn('Unknown general name type %d' % gntype,
                                   RuntimeWarning, stacklevel=2)
                L.BIO_ctrl(bio, K.BIO_CTRL_RESET, 0, None)
                L.GENERAL_NAME_print(bio, name)
                line = _bio_line(bio).decode('utf-8', 'replace')
                if ':' not in line:
                    raise ValueError('Invalid value %.200s' % line)
                k, v = line.split(':', 1)
                result.append((k, v))
    finally:
        L.BIO_free(bio)
        L.GENERAL_NAMES_free(names)
    return tuple(result)


def _get_aia_uri(cert, nid):
    info = L.X509_get_ext_d2i(cert, _NID_info_access, None, None)
    if info is None:
        return None
    try:
        out = []
        for i in range(L.OPENSSL_sk_num(info)):
            ad = L.OPENSSL_sk_value(info, i)
            method = _C.read_ptr(ad, 0)
            location = _C.read_ptr(ad, 8)
            if L.OBJ_obj2nid(method) != nid or _gn_type(location) != K.GEN_URI:
                continue
            out.append(_asn1_string_bytes(_gn_value(location)).decode(
                'utf-8', 'surrogateescape'))
        return tuple(out) if out else None
    finally:
        L.AUTHORITY_INFO_ACCESS_free(info)


def _get_crl_dp(cert):
    dps = L.X509_get_ext_d2i(cert, _NID_crl_distribution_points, None, None)
    if dps is None:
        return None
    try:
        out = []
        for i in range(L.OPENSSL_sk_num(dps)):
            dp = L.OPENSSL_sk_value(dps, i)
            distpoint = _C.read_ptr(dp, 0)
            if distpoint is None:
                continue        # CVE-2019-5010
            gns = _C.read_ptr(distpoint, 8)
            if gns is None:
                continue
            for j in range(L.OPENSSL_sk_num(gns)):
                gn = L.OPENSSL_sk_value(gns, j)
                if _gn_type(gn) != K.GEN_URI:
                    continue
                out.append(_asn1_string_bytes(_gn_value(gn)).decode(
                    'utf-8', 'surrogateescape'))
        return tuple(out) if out else None
    finally:
        L.CRL_DIST_POINTS_free(dps)


def _decode_certificate(cert):
    retval = {}
    retval['subject'] = _create_tuple_for_X509_NAME(L.X509_get_subject_name(cert))
    retval['issuer'] = _create_tuple_for_X509_NAME(L.X509_get_issuer_name(cert))
    retval['version'] = L.X509_get_version(cert) + 1
    bio = _new_mem_bio()
    try:
        L.i2a_ASN1_INTEGER(bio, L.X509_get_serialNumber(cert))
        retval['serialNumber'] = _bio_line(bio).decode('ascii')
        L.BIO_ctrl(bio, K.BIO_CTRL_RESET, 0, None)
        L.ASN1_TIME_print(bio, L.X509_get0_notBefore(cert))
        retval['notBefore'] = _bio_line(bio).decode('ascii')
        L.BIO_ctrl(bio, K.BIO_CTRL_RESET, 0, None)
        L.ASN1_TIME_print(bio, L.X509_get0_notAfter(cert))
        retval['notAfter'] = _bio_line(bio).decode('ascii')
    finally:
        L.BIO_free(bio)
    alt = _get_peer_alt_names(cert)
    if alt is not None:
        retval['subjectAltName'] = alt
    obj = _get_aia_uri(cert, _NID_ad_OCSP)
    if obj is not None:
        retval['OCSP'] = obj
    obj = _get_aia_uri(cert, _NID_ad_ca_issuers)
    if obj is not None:
        retval['caIssuers'] = obj
    obj = _get_crl_dp(cert)
    if obj is not None:
        retval['crlDistributionPoints'] = obj
    return retval


def _certificate_to_der(cert):
    bio = _new_mem_bio()
    try:
        if L.i2d_X509_bio(bio, cert) != 1:
            raise _ssl_error()
        return _bio_bytes(bio)
    finally:
        L.BIO_free(bio)


def _test_decode_cert(path):
    path = _os.fsdecode(_os.fsencode(path))
    try:
        with open(path, 'rb') as f:
            data = f.read()
    except OSError:
        raise SSLError("Can't open file") from None
    buf = _C.from_bytes(data)
    bio = L.BIO_new_mem_buf(buf, len(data))
    try:
        x = L.PEM_read_bio_X509(bio, None, None, None)
        if x is None:
            raise SSLError('Error decoding PEM-encoded file')
        try:
            return _decode_certificate(x)
        finally:
            L.X509_free(x)
    finally:
        L.BIO_free(bio)
        L.ERR_clear_error()


class Certificate:
    """A certificate, as get_verified_chain() and get_unverified_chain()
    answer them (Modules/_ssl/cert.c)."""

    __slots__ = ('_cert', '_hash')

    def __init__(self, *args, **kwargs):
        raise TypeError("cannot create '_ssl.Certificate' instances")

    @classmethod
    def _from_x509(cls, cert, upref):
        self = object.__new__(cls)
        if upref:
            L.X509_up_ref(cert)
        self._cert = cert
        self._hash = -1
        return self

    def public_bytes(self, format=ENCODING_PEM):
        bio = _new_mem_bio()
        try:
            if format == ENCODING_PEM:
                rc = L.PEM_write_bio_X509(bio, self._cert)
            elif format == K.ENCODING_PEM_AUX:
                rc = L.PEM_write_bio_X509_AUX(bio, self._cert)
            elif format == ENCODING_DER:
                rc = L.i2d_X509_bio(bio, self._cert)
            else:
                raise ValueError('Unsupported format')
            if rc != 1:
                raise _ssl_error()
            data = _bio_bytes(bio)
            return data if format == ENCODING_DER else data.decode('ascii')
        finally:
            L.BIO_free(bio)

    def get_info(self):
        return _decode_certificate(self._cert)

    def __repr__(self):
        bio = _new_mem_bio()
        try:
            if L.X509_NAME_print_ex(bio, L.X509_get_subject_name(self._cert), 0,
                                  K.XN_FLAG_RFC2253) <= 0:
                raise _ssl_error()
            subject = _bio_bytes(bio).decode('utf-8')
        finally:
            L.BIO_free(bio)
        return "<%s '%s'>" % ('_ssl.Certificate', subject)

    def __hash__(self):
        if self._hash == -1:
            h = L.X509_subject_name_hash(self._cert)
            self._hash = -2 if h == -1 else h
        return self._hash

    def __eq__(self, other):
        if not isinstance(other, Certificate):
            return NotImplemented
        return L.X509_cmp(self._cert, other._cert) == 0

    def __ne__(self, other):
        if not isinstance(other, Certificate):
            return NotImplemented
        return L.X509_cmp(self._cert, other._cert) != 0


Certificate.__module__ = '_ssl'


def _certs_from_stack(stack, upref):
    return [Certificate._from_x509(L.OPENSSL_sk_value(stack, i), upref)
            for i in range(L.OPENSSL_sk_num(stack))]


# ------------------------------------------------------------ ciphers

def _cipher_to_tuple(cipher):
    name = L.SSL_CIPHER_get_name(cipher)
    proto = L.SSL_CIPHER_get_version(cipher)
    return (_cstr(name), _cstr(proto), L.SSL_CIPHER_get_bits(cipher, None))


def _nid_ln(nid):
    return None if nid == _NID_undef else _cstr(L.OBJ_nid2ln(nid))


def _cipher_to_dict(cipher):
    buf = _C.malloc(512)
    L.SSL_CIPHER_description(cipher, buf, 511)
    desc = _C.cstring(buf).decode('ascii', 'replace')
    if len(desc) > 1 and desc.endswith('\n'):
        desc = desc[:-1]
    alg = _C.malloc(4)
    strength = L.SSL_CIPHER_get_bits(cipher, alg)
    return {
        'id': L.SSL_CIPHER_get_id(cipher),
        'name': _cstr(L.SSL_CIPHER_get_name(cipher)),
        'protocol': _cstr(L.SSL_CIPHER_get_version(cipher)),
        'description': desc,
        'strength_bits': strength,
        'alg_bits': _C.read_int(alg, 0, 4, True),
        'aead': bool(L.SSL_CIPHER_is_aead(cipher)),
        'symmetric': _nid_ln(L.SSL_CIPHER_get_cipher_nid(cipher)),
        'digest': _nid_ln(L.SSL_CIPHER_get_digest_nid(cipher)),
        'kea': _nid_ln(L.SSL_CIPHER_get_kx_nid(cipher)),
        'auth': _nid_ln(L.SSL_CIPHER_get_auth_nid(cipher)),
    }


# ------------------------------------------------------------ MemoryBIO

class MemoryBIO:
    """A memory BIO (Modules/_ssl.c _ssl.MemoryBIO)."""

    def __init__(self):
        bio = L.BIO_new(L.BIO_s_mem())
        if bio is None:
            raise MemoryError('failed to allocate BIO')
        # Non-blocking: an empty read() is not EOF, so SSL retries it.
        L.BIO_set_flags(bio, K.BIO_FLAGS_READ | K.BIO_FLAGS_SHOULD_RETRY)
        L.BIO_ctrl(bio, K.BIO_C_SET_BUF_MEM_EOF_RETURN, -1, None)
        self._bio = bio
        self._eof_written = False

    @property
    def pending(self):
        """The number of bytes pending in the memory BIO."""
        return L.BIO_ctrl_pending(self._bio)

    @property
    def eof(self):
        """Whether the memory BIO is at EOF."""
        return L.BIO_ctrl_pending(self._bio) == 0 and self._eof_written

    def read(self, size=-1):
        avail = min(L.BIO_ctrl_pending(self._bio), 0x7FFFFFFF)
        if size < 0 or size > avail:
            size = avail
        if size == 0:
            return b''
        buf = _C.malloc(size)
        n = L.BIO_read(self._bio, buf, size)
        if n < 0:
            raise _ssl_error()
        return _C.read(buf, 0, n)

    def write(self, b):
        data = bytes(memoryview(b))
        if len(data) > 0x7FFFFFFF:
            raise OverflowError('string longer than %d bytes' % 0x7FFFFFFF)
        if self._eof_written:
            raise SSLError('cannot write() after write_eof()')
        if not data:
            return 0
        n = L.BIO_write(self._bio, data, len(data))
        if n < 0:
            raise _ssl_error()
        return n

    def write_eof(self):
        self._eof_written = True
        L.BIO_clear_flags(self._bio, K.BIO_FLAGS_RWS | K.BIO_FLAGS_SHOULD_RETRY)
        L.BIO_ctrl(self._bio, K.BIO_C_SET_BUF_MEM_EOF_RETURN, 0, None)

    def __del__(self):
        bio = getattr(self, '_bio', None)
        if bio is not None:
            self._bio = None
            L.BIO_free(bio)


MemoryBIO.__module__ = '_ssl'


# ------------------------------------------------------------ SSLSession

class SSLSession:
    """A TLS session (Modules/_ssl.c _ssl.SSLSession)."""

    def __init__(self, *args, **kwargs):
        raise TypeError("cannot create '_ssl.SSLSession' instances")

    @classmethod
    def _wrap(cls, ctx, session):
        self = object.__new__(cls)
        self._ctx = ctx
        self._session = session
        return self

    def _id_bytes(self):
        n = _C.malloc(4)
        p = L.SSL_SESSION_get_id(self._session, n)
        length = _C.read_int(n, 0, 4, False)
        return _C.read(p, 0, length) if length else b''

    def __eq__(self, other):
        if not isinstance(other, SSLSession):
            return NotImplemented
        return self is other or self._id_bytes() == other._id_bytes()

    def __ne__(self, other):
        if not isinstance(other, SSLSession):
            return NotImplemented
        return not (self is other or self._id_bytes() == other._id_bytes())

    __hash__ = None

    @property
    def time(self):
        """Session creation time (seconds since epoch)."""
        return L.SSL_SESSION_get_time_ex(self._session)

    @property
    def timeout(self):
        """Session timeout (delta in seconds)."""
        return L.SSL_SESSION_get_timeout(self._session)

    @property
    def ticket_lifetime_hint(self):
        """Ticket life time hint."""
        return L.SSL_SESSION_get_ticket_lifetime_hint(self._session)

    @property
    def id(self):
        """Session ID."""
        return self._id_bytes()

    @property
    def has_ticket(self):
        """Does the session contain a ticket?"""
        return bool(L.SSL_SESSION_has_ticket(self._session))

    def __del__(self):
        s = getattr(self, '_session', None)
        if s is not None:
            self._session = None
            L.SSL_SESSION_free(s)


SSLSession.__module__ = '_ssl'


# ------------------------------------------------------------ _SSLContext

# The platform trust stores a CPython build's OPENSSLDIR would name, for
# set_default_verify_paths() when GemStone's own compiled-in one is missing.
_PLATFORM_CA_FILES = (
    '/etc/ssl/certs/ca-certificates.crt',                    # Debian/Ubuntu
    '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem',     # RHEL/CentOS
    '/etc/ssl/cert.pem',                                     # macOS/BSD
)
_PLATFORM_CA_DIRS = (
    '/etc/ssl/certs',
    '/etc/pki/tls/certs',
)


class _SSLContext:
    """An SSL_CTX (Modules/_ssl.c _ssl._SSLContext)."""

    def __new__(cls, protocol, *args, **kwargs):
        if protocol == PROTOCOL_TLS:
            _warnings.warn('ssl.PROTOCOL_TLS is deprecated', DeprecationWarning, stacklevel=2)
            method = L.TLS_method()
        elif protocol == PROTOCOL_TLS_CLIENT:
            method = L.TLS_client_method()
        elif protocol == PROTOCOL_TLS_SERVER:
            method = L.TLS_server_method()
        elif protocol in (PROTOCOL_TLSv1, PROTOCOL_TLSv1_1, PROTOCOL_TLSv1_2):
            name = {PROTOCOL_TLSv1: 'TLSv1', PROTOCOL_TLSv1_1: 'TLSv1_1',
                    PROTOCOL_TLSv1_2: 'TLSv1_2'}[protocol]
            _warnings.warn('ssl.PROTOCOL_%s is deprecated' % name,
                           DeprecationWarning, stacklevel=2)
            method = _C.call('%s_method' % name, _P, ())
        else:
            method = None
        if method is None:
            raise ValueError('invalid or unsupported protocol version %i' % protocol)
        ctx = L.SSL_CTX_new(method)
        if ctx is None:
            raise _ssl_error()
        self = object.__new__(cls)
        self._ctx = ctx
        self._protocol = protocol
        self._check_hostname = False
        self._post_handshake_auth = False
        self._sni_callback = None
        self._msg_callback = None
        self._keylog_filename = None
        self._alpn_protocols = None
        # OpenSSL's default password callback answers its userdata as the
        # passphrase; an empty one makes an encrypted key fail instead of
        # prompting on the gem's terminal.  See load_cert_chain.  Held by the
        # context, never by the module: C memory does not outlive the
        # session, and a module can be committed.
        self._no_passphrase = _C.from_bytes(b'\x00')
        L.SSL_CTX_set_default_passwd_cb_userdata(ctx, self._no_passphrase)
        if protocol == PROTOCOL_TLS_CLIENT:
            self._check_hostname = True
            self._set_verify_mode(CERT_REQUIRED)
        else:
            self._set_verify_mode(CERT_NONE)
        options = OP_ALL | OP_NO_SSLv2
        options |= OP_NO_SSLv3
        options |= OP_NO_COMPRESSION | OP_CIPHER_SERVER_PREFERENCE
        options |= OP_SINGLE_DH_USE | OP_SINGLE_ECDH_USE
        L.SSL_CTX_set_options(ctx, options)
        if L.SSL_CTX_set_cipher_list(ctx, _DEFAULT_CIPHERS) == 0:
            L.ERR_clear_error()
            raise SSLError('No cipher can be selected.')
        if protocol in (PROTOCOL_TLS, PROTOCOL_TLS_CLIENT, PROTOCOL_TLS_SERVER):
            if L.SSL_CTX_ctrl(ctx, K.SSL_CTRL_SET_MIN_PROTO_VERSION,
                            K.PY_SSL_MIN_PROTOCOL, None) == 0:
                raise ValueError('Failed to set minimum protocol 0x%x' % K.PY_SSL_MIN_PROTOCOL)
        L.SSL_CTX_ctrl(ctx, K.SSL_CTRL_MODE, K.SSL_MODE_RELEASE_BUFFERS, None)
        params = L.SSL_CTX_get0_param(ctx)
        L.X509_VERIFY_PARAM_set_flags(params, K.X509_V_FLAG_TRUSTED_FIRST)
        L.X509_VERIFY_PARAM_set_hostflags(params, K.X509_CHECK_FLAG_NO_PARTIAL_WILDCARDS)
        L.SSL_CTX_set_post_handshake_auth(ctx, 0)
        return self

    def __del__(self):
        ctx = getattr(self, '_ctx', None)
        if ctx is not None:
            self._ctx = None
            L.SSL_CTX_free(ctx)

    # -- verification -------------------------------------------------

    def _set_verify_mode(self, n):
        if n == CERT_NONE:
            mode = K.SSL_VERIFY_NONE
        elif n == CERT_OPTIONAL:
            mode = K.SSL_VERIFY_PEER
        elif n == CERT_REQUIRED:
            mode = K.SSL_VERIFY_PEER | K.SSL_VERIFY_FAIL_IF_NO_PEER_CERT
        else:
            raise ValueError('invalid value for verify_mode')
        L.SSL_CTX_set_verify(self._ctx, mode, None)

    @property
    def verify_mode(self):
        mode = L.SSL_CTX_get_verify_mode(self._ctx) & 0x3
        if mode == K.SSL_VERIFY_NONE:
            return CERT_NONE
        if mode == K.SSL_VERIFY_PEER:
            return CERT_OPTIONAL
        if mode == K.SSL_VERIFY_PEER | K.SSL_VERIFY_FAIL_IF_NO_PEER_CERT:
            return CERT_REQUIRED
        raise SSLError('invalid return value from SSL_CTX_get_verify_mode')

    @verify_mode.setter
    def verify_mode(self, value):
        n = _index(value)
        if n == CERT_NONE and self._check_hostname:
            raise ValueError('Cannot set verify_mode to CERT_NONE when '
                             'check_hostname is enabled.')
        self._set_verify_mode(n)

    @property
    def verify_flags(self):
        return L.X509_VERIFY_PARAM_get_flags(L.SSL_CTX_get0_param(self._ctx))

    @verify_flags.setter
    def verify_flags(self, value):
        new_flags = _index(value)
        if new_flags < 0:
            raise OverflowError("can't convert negative value to unsigned int")
        params = L.SSL_CTX_get0_param(self._ctx)
        flags = L.X509_VERIFY_PARAM_get_flags(params)
        clear = flags & ~new_flags
        set_ = ~flags & new_flags
        if clear and not L.X509_VERIFY_PARAM_clear_flags(params, clear):
            raise _ssl_error()
        if set_ and not L.X509_VERIFY_PARAM_set_flags(params, set_):
            raise _ssl_error()

    @property
    def check_hostname(self):
        return self._check_hostname

    @check_hostname.setter
    def check_hostname(self, value):
        check = bool(value)
        if check and L.SSL_CTX_get_verify_mode(self._ctx) == K.SSL_VERIFY_NONE:
            self._set_verify_mode(CERT_REQUIRED)
        self._check_hostname = check

    @property
    def _host_flags(self):
        return L.X509_VERIFY_PARAM_get_hostflags(L.SSL_CTX_get0_param(self._ctx))

    @_host_flags.setter
    def _host_flags(self, value):
        L.X509_VERIFY_PARAM_set_hostflags(L.SSL_CTX_get0_param(self._ctx), _index(value))

    @property
    def post_handshake_auth(self):
        return self._post_handshake_auth

    @post_handshake_auth.setter
    def post_handshake_auth(self, value):
        self._post_handshake_auth = bool(value)

    @property
    def protocol(self):
        return self._protocol

    # -- protocol versions -------------------------------------------

    def _set_min_max(self, arg, what):
        v = _index(arg)
        if self._protocol not in (PROTOCOL_TLS_CLIENT, PROTOCOL_TLS_SERVER, PROTOCOL_TLS):
            raise ValueError("The context's protocol doesn't support modification "
                             "of highest and lowest version.")
        if v == PROTO_SSLv3:
            _warnings.warn('ssl.TLSVersion.SSLv3 is deprecated', DeprecationWarning, stacklevel=3)
        elif v == PROTO_TLSv1:
            _warnings.warn('ssl.TLSVersion.TLSv1 is deprecated', DeprecationWarning, stacklevel=3)
        elif v == PROTO_TLSv1_1:
            _warnings.warn('ssl.TLSVersion.TLSv1_1 is deprecated', DeprecationWarning, stacklevel=3)
        elif v not in (PROTO_MINIMUM_SUPPORTED, PROTO_MAXIMUM_SUPPORTED,
                       PROTO_TLSv1_2, PROTO_TLSv1_3):
            raise ValueError('Unsupported TLS/SSL version 0x%x' % (v & 0xFFFFFFFF))
        if what == 0:
            if v == PROTO_MINIMUM_SUPPORTED:
                v = 0
            elif v == PROTO_MAXIMUM_SUPPORTED:
                v = K.PY_PROTO_MAXIMUM_AVAILABLE
            result = L.SSL_CTX_ctrl(self._ctx, K.SSL_CTRL_SET_MIN_PROTO_VERSION, v, None)
        else:
            if v == PROTO_MAXIMUM_SUPPORTED:
                v = 0
            elif v == PROTO_MINIMUM_SUPPORTED:
                v = K.PY_PROTO_MINIMUM_AVAILABLE
            result = L.SSL_CTX_ctrl(self._ctx, K.SSL_CTRL_SET_MAX_PROTO_VERSION, v, None)
        if result == 0:
            raise ValueError('Unsupported protocol version 0x%x' % (v & 0xFFFFFFFF))

    @property
    def minimum_version(self):
        v = L.SSL_CTX_ctrl(self._ctx, K.SSL_CTRL_GET_MIN_PROTO_VERSION, 0, None)
        return PROTO_MINIMUM_SUPPORTED if v == 0 else v

    @minimum_version.setter
    def minimum_version(self, value):
        self._set_min_max(value, 0)

    @property
    def maximum_version(self):
        v = L.SSL_CTX_ctrl(self._ctx, K.SSL_CTRL_GET_MAX_PROTO_VERSION, 0, None)
        return PROTO_MAXIMUM_SUPPORTED if v == 0 else v

    @maximum_version.setter
    def maximum_version(self, value):
        self._set_min_max(value, 1)

    @property
    def num_tickets(self):
        return L.SSL_CTX_get_num_tickets(self._ctx)

    @num_tickets.setter
    def num_tickets(self, value):
        num = _index(value)
        if num < 0:
            raise ValueError('value must be non-negative')
        if self._protocol != PROTOCOL_TLS_SERVER:
            raise ValueError('SSLContext is not a server context.')
        if L.SSL_CTX_set_num_tickets(self._ctx, num) != 1:
            raise ValueError('failed to set num tickets.')

    @property
    def security_level(self):
        return L.SSL_CTX_get_security_level(self._ctx)

    @property
    def options(self):
        return L.SSL_CTX_get_options(self._ctx)

    @options.setter
    def options(self, value):
        # _ssl.c: PyArg_Parse "O!" with PyLong_Type, then a negative check
        # before PyLong_AsUnsignedLongLong.
        if not isinstance(value, int):
            raise TypeError('options must be int, not %s' % type(value).__name__)
        new_opts = int(value)
        if new_opts < 0:
            raise ValueError('invalid options value')
        if new_opts >= 1 << 64:
            raise OverflowError('Python int too large to convert to C unsigned long long')
        opt_no = (OP_NO_SSLv2 | OP_NO_SSLv3 | OP_NO_TLSv1 | OP_NO_TLSv1_1 |
                  OP_NO_TLSv1_2 | OP_NO_TLSv1_3)
        opts = L.SSL_CTX_get_options(self._ctx)
        clear = opts & ~new_opts
        set_ = ~opts & new_opts
        if set_ & opt_no:
            _warnings.warn('ssl.OP_NO_SSL*/ssl.OP_NO_TLS* options are deprecated',
                           DeprecationWarning, stacklevel=2)
        if clear:
            L.SSL_CTX_clear_options(self._ctx, clear)
        if set_:
            L.SSL_CTX_set_options(self._ctx, set_)

    # -- ciphers / ALPN ----------------------------------------------

    def set_ciphers(self, cipherlist):
        if not isinstance(cipherlist, str):
            raise TypeError('set_ciphers() argument must be str, not %s'
                            % type(cipherlist).__name__)
        if '\x00' in cipherlist:
            raise ValueError('embedded null character')
        if L.SSL_CTX_set_cipher_list(self._ctx, cipherlist) == 0:
            L.ERR_clear_error()
            raise SSLError('No cipher can be selected.')

    def get_ciphers(self):
        ssl = L.SSL_new(self._ctx)
        if ssl is None:
            raise _ssl_error()
        try:
            sk = L.SSL_get_ciphers(ssl)
            return [_cipher_to_dict(L.OPENSSL_sk_value(sk, i))
                    for i in range(L.OPENSSL_sk_num(sk))]
        finally:
            L.SSL_free(ssl)

    def _set_alpn_protocols(self, protos):
        data = bytes(memoryview(protos))
        self._alpn_protocols = data
        # The CLIENT half: the list offered in the ClientHello.  A SERVER
        # selects through SSL_CTX_set_alpn_select_cb, a C callback -- not
        # available here yet, so a server context offers no ALPN.
        if L.SSL_CTX_set_alpn_protos(self._ctx, data, len(data)):
            raise MemoryError()

    # -- certificates --------------------------------------------------

    def load_cert_chain(self, certfile, keyfile=None, password=None):
        L.ERR_clear_error()
        certfile_b = _fsencode_path(certfile, 'certfile')
        keyfile_b = None if keyfile is None else _fsencode_path(keyfile, 'keyfile')
        callable_pw = None
        passphrase = None
        if password is not None:
            if callable(password):
                callable_pw = password
            else:
                passphrase = _password_bytes(password, 'password should be a string or callable')
        try:
            if passphrase is not None:
                self._use_passphrase(passphrase)
            _check_readable(certfile_b)
            if L.SSL_CTX_use_certificate_chain_file(self._ctx, certfile_b) != 1:
                raise _ssl_error()
            keypath = keyfile_b if keyfile_b is not None else certfile_b
            _check_readable(keypath)
            # CPython's _password_callback is asked only when OpenSSL needs a
            # passphrase.  Without a C callback there is no such hook, and
            # the empty default passphrase is not refused as a missing one
            # (PEM_R_BAD_PASSWORD_READ) but tried, and fails as a bad decrypt
            # like any wrong password.  So the callable is asked up front, but
            # only for a key whose PEM says it is encrypted.
            if callable_pw is not None and _pem_is_encrypted(keypath):
                passphrase = _password_bytes(callable_pw(),
                                             'password callback must return a string')
                self._use_passphrase(passphrase)
            if L.SSL_CTX_use_PrivateKey_file(self._ctx, keypath, K.SSL_FILETYPE_PEM) != 1:
                raise _ssl_error()
            if L.SSL_CTX_check_private_key(self._ctx) != 1:
                raise _ssl_error()
        finally:
            L.SSL_CTX_set_default_passwd_cb_userdata(self._ctx, self._no_passphrase)
            self._passphrase_buffer = None

    def _use_passphrase(self, passphrase):
        if len(passphrase) > K.PEM_BUFSIZE:
            raise ValueError('password cannot be longer than %d bytes' % K.PEM_BUFSIZE)
        self._passphrase_buffer = _C.from_bytes(passphrase + b'\x00')
        L.SSL_CTX_set_default_passwd_cb_userdata(self._ctx, self._passphrase_buffer)

    def _add_ca_certs(self, data, filetype):
        if len(data) <= 0:
            raise ValueError('Empty certificate data')
        if len(data) > 0x7FFFFFFF:
            raise OverflowError('Certificate data is too long.')
        buf = _C.from_bytes(data)
        bio = L.BIO_new_mem_buf(buf, len(data))
        if bio is None:
            raise _ssl_error("Can't allocate buffer")
        store = L.SSL_CTX_get_cert_store(self._ctx)
        loaded = 0
        was_bio_eof = False
        try:
            while True:
                if filetype == K.SSL_FILETYPE_ASN1:
                    if L.BIO_ctrl(bio, K.BIO_CTRL_EOF, 0, None):
                        was_bio_eof = True
                        break
                    cert = L.d2i_X509_bio(bio, None)
                else:
                    cert = L.PEM_read_bio_X509(bio, None, None, self._no_passphrase)
                if cert is None:
                    break
                r = L.X509_STORE_add_cert(store, cert)
                L.X509_free(cert)
                if not r:
                    err = L.ERR_peek_last_error()
                    if (_err_lib(err) == K.ERR_LIB_X509 and
                            _err_reason(err) == K.X509_R_CERT_ALREADY_IN_HASH_TABLE):
                        L.ERR_clear_error()
                    else:
                        break
                loaded += 1
            err = L.ERR_peek_last_error()
            if loaded == 0:
                if filetype == K.SSL_FILETYPE_PEM:
                    msg = 'no start line: cadata does not contain a certificate'
                else:
                    msg = 'not enough data: cadata does not contain a certificate'
                raise _ssl_error(msg)
            elif filetype == K.SSL_FILETYPE_ASN1 and was_bio_eof:
                L.ERR_clear_error()
            elif (filetype == K.SSL_FILETYPE_PEM and _err_lib(err) == K.ERR_LIB_PEM
                  and _err_reason(err) == K.PEM_R_NO_START_LINE):
                L.ERR_clear_error()
            elif err != 0:
                raise _ssl_error()
        finally:
            L.BIO_free(bio)

    def load_verify_locations(self, cafile=None, capath=None, cadata=None):
        if cafile is None and capath is None and cadata is None:
            raise TypeError('cafile, capath and cadata cannot be all omitted')
        cafile_b = None if cafile is None else _fsencode_path(cafile, 'cafile')
        capath_b = None if capath is None else _fsencode_path(capath, 'capath')
        if cadata is not None:
            if isinstance(cadata, str):
                try:
                    data = cadata.encode('ascii')
                except UnicodeEncodeError:
                    raise TypeError('cadata should be an ASCII string or a '
                                    'bytes-like object') from None
                self._add_ca_certs(data, K.SSL_FILETYPE_PEM)
            else:
                try:
                    view = memoryview(cadata)
                except TypeError:
                    raise TypeError('cadata should be an ASCII string or a '
                                    'bytes-like object') from None
                if view.ndim > 1:
                    raise TypeError('cadata should be a contiguous buffer with '
                                    'a single dimension')
                self._add_ca_certs(bytes(view), K.SSL_FILETYPE_ASN1)
        if cafile_b is not None or capath_b is not None:
            if cafile_b is not None:
                _check_readable(cafile_b)
            if capath_b is not None and not _os.path.isdir(capath_b):
                raise OSError(_errno.ENOENT, _os.strerror(_errno.ENOENT))
            if L.SSL_CTX_load_verify_locations(self._ctx, cafile_b, capath_b) != 1:
                raise _ssl_error()

    def load_dh_params(self, path):
        path_b = _os.fsdecode(_os.fsencode(path))
        try:
            with open(path_b, 'rb') as f:
                data = f.read()
        except OSError as e:
            raise OSError(e.errno, e.strerror, path) from None
        buf = _C.from_bytes(data)
        bio = L.BIO_new_mem_buf(buf, len(data))
        # _ssl.c reads with PEM_read_DHparams, the legacy DH reader, and that
        # choice is visible: its failure on a non-DH PEM is library 'PEM',
        # where the generic PEM_read_bio_Parameters fails in OSSL_DECODER
        # (test_lib_reason).  This is its BIO twin.
        try:
            dh = L.PEM_read_bio_DHparams(bio, None, None, None)
            if dh is None:
                raise _ssl_error()
            try:
                # SSL_CTX_set_tmp_dh, a macro; the context takes its own copy.
                if not L.SSL_CTX_ctrl(self._ctx, K.SSL_CTRL_SET_TMP_DH, 0, dh):
                    raise _ssl_error()
            finally:
                L.DH_free(dh)
        finally:
            L.BIO_free(bio)

    def set_default_verify_paths(self):
        if not L.SSL_CTX_set_default_verify_paths(self._ctx):
            raise _ssl_error()
        # GemStone's OpenSSL is built with OPENSSLDIR=/usr/local/ssl, which is
        # normally absent, so on its own this call trusts NOTHING and every
        # verified HTTPS connection fails.  CPython's OpenSSL is built to point
        # at the platform store; when neither the SSL_CERT_FILE / SSL_CERT_DIR
        # override nor the compiled-in location exists, load the platform
        # bundle that such a build would have named.
        file_env, file_default, dir_env, dir_default = _openssl_default_verify_paths()
        if _os.environ.get(file_env) or _os.environ.get(dir_env):
            return
        if (file_default and _os.path.isfile(file_default)) or \
                (dir_default and _os.path.isdir(dir_default)):
            return
        cafile = _platform_ca_file()
        capath = _platform_ca_dir()
        if cafile or capath:
            if L.SSL_CTX_load_verify_locations(self._ctx, cafile, capath) != 1:
                L.ERR_clear_error()

    def set_ecdh_curve(self, name):
        name_b = _os.fsencode(name)
        nid = L.OBJ_sn2nid(name_b)
        if nid == 0:
            raise ValueError('unknown elliptic curve name %r' % (name,))
        if L.SSL_CTX_ctrl(self._ctx, K.SSL_CTRL_SET_GROUPS_LIST, 0, name_b) != 1:
            raise _ssl_error()

    def session_stats(self):
        return {k: L.SSL_CTX_ctrl(self._ctx, v, 0, None)
                for k, v in K.SSL_CTRL_SESS.items()}

    def _store_objects(self):
        objs = L.X509_STORE_get1_objects(L.SSL_CTX_get_cert_store(self._ctx))
        if objs is None:
            raise MemoryError('failed to query cert store')
        return objs

    def _free_objects(self, objs):
        for i in range(L.OPENSSL_sk_num(objs)):
            L.X509_OBJECT_free(L.OPENSSL_sk_value(objs, i))
        L.OPENSSL_sk_free(objs)

    def cert_store_stats(self):
        objs = self._store_objects()
        x509 = crl = ca = 0
        try:
            for i in range(L.OPENSSL_sk_num(objs)):
                obj = L.OPENSSL_sk_value(objs, i)
                t = L.X509_OBJECT_get_type(obj)
                if t == K.X509_LU_X509:
                    x509 += 1
                    if L.X509_check_ca(L.X509_OBJECT_get0_X509(obj)):
                        ca += 1
                elif t == K.X509_LU_CRL:
                    crl += 1
        finally:
            self._free_objects(objs)
        return {'x509': x509, 'crl': crl, 'x509_ca': ca}

    def get_ca_certs(self, binary_form=False):
        objs = self._store_objects()
        out = []
        try:
            for i in range(L.OPENSSL_sk_num(objs)):
                obj = L.OPENSSL_sk_value(objs, i)
                if L.X509_OBJECT_get_type(obj) != K.X509_LU_X509:
                    continue
                cert = L.X509_OBJECT_get0_X509(obj)
                if not L.X509_check_ca(cert):
                    continue
                out.append(_certificate_to_der(cert) if binary_form
                           else _decode_certificate(cert))
        finally:
            self._free_objects(objs)
        return out

    # -- callbacks not yet available -------------------------------------

    @property
    def sni_callback(self):
        return self._sni_callback

    @sni_callback.setter
    def sni_callback(self, value):
        if self._protocol == PROTOCOL_TLS_CLIENT:
            raise ValueError('sni_callback cannot be set on TLS_CLIENT context')
        if value is None:
            self._sni_callback = None
            return
        if not callable(value):
            raise TypeError('not a callable object')
        raise NotImplementedError(
            'sni_callback needs an OpenSSL callback, which Grail does not provide yet')

    @property
    def _msg_callback(self):
        return self.__dict__.get('_msg_cb')

    @_msg_callback.setter
    def _msg_callback(self, value):
        if value is None:
            self.__dict__['_msg_cb'] = None
            return
        if not callable(value):
            raise TypeError('%r is not callable.' % (value,))
        raise NotImplementedError(
            '_msg_callback needs an OpenSSL callback, which Grail does not provide yet')

    @property
    def keylog_filename(self):
        return self._keylog_filename

    @keylog_filename.setter
    def keylog_filename(self, value):
        if value is None:
            self._keylog_filename = None
            return
        raise NotImplementedError(
            'keylog_filename needs an OpenSSL callback, which Grail does not provide yet')

    def set_psk_client_callback(self, callback):
        raise NotImplementedError(
            'PSK callbacks need an OpenSSL callback, which Grail does not provide yet')

    def set_psk_server_callback(self, callback, identity_hint=None):
        raise NotImplementedError(
            'PSK callbacks need an OpenSSL callback, which Grail does not provide yet')

    # -- connections -------------------------------------------------

    def _wrap_socket(self, sock, server_side, server_hostname=None, *,
                     owner=None, session=None):
        if not isinstance(sock, _socket.socket):
            raise TypeError('_wrap_socket() argument 1 must be _socket.socket, not %s'
                            % type(sock).__name__)
        hostname = _hostname_bytes(server_hostname)
        return _SSLSocket._create(self, sock, bool(server_side), hostname,
                                  (owner, session, None, None))

    def _wrap_bio(self, incoming, outgoing, server_side, server_hostname=None, *,
                  owner=None, session=None):
        if not isinstance(incoming, MemoryBIO) or not isinstance(outgoing, MemoryBIO):
            raise TypeError('_wrap_bio() arguments must be MemoryBIO objects')
        hostname = _hostname_bytes(server_hostname)
        return _SSLSocket._create(self, None, bool(server_side), hostname,
                                  (owner, session, incoming, outgoing))


_SSLContext.__module__ = '_ssl'


def _index(value):
    if isinstance(value, bool) or not hasattr(value, '__index__'):
        if isinstance(value, bool):
            return int(value)
        raise TypeError("'%s' object cannot be interpreted as an integer"
                        % type(value).__name__)
    return value.__index__()


def _password_bytes(password, bad_type_error):
    if isinstance(password, str):
        return password.encode('utf-8')
    if isinstance(password, (bytes, bytearray)):
        return bytes(password)
    raise TypeError(bad_type_error)


def _pem_is_encrypted(path):
    """Whether a PEM key file holds an encrypted key: PKCS#8's
    ``BEGIN ENCRYPTED PRIVATE KEY'' or the legacy ``Proc-Type: 4,ENCRYPTED''
    header.  A file that cannot be read is left to OpenSSL to report."""
    try:
        with open(_os.fsdecode(path), 'rb') as f:
            data = f.read()
    except OSError:
        return False
    return (b'-----BEGIN ENCRYPTED PRIVATE KEY-----' in data or
            b'Proc-Type: 4,ENCRYPTED' in data)


def _hostname_bytes(server_hostname):
    if server_hostname is None:
        return None
    if isinstance(server_hostname, str):
        try:
            b = server_hostname.encode('ascii')
        except UnicodeEncodeError:
            raise UnicodeEncodeError('ascii', server_hostname, 0, 1,
                                     'ordinal not in range(128)') from None
    elif isinstance(server_hostname, (bytes, bytearray)):
        b = bytes(server_hostname)
    else:
        raise TypeError('server_hostname must be str or bytes, not %s'
                        % type(server_hostname).__name__)
    if b'\x00' in b:
        # _ssl.c parses the name with PyArg_Parse "es", whose refusal of a NUL
        # is converterr's TypeError, not the ValueError of "s".
        raise TypeError('argument must be encoded string without null bytes, not %s'
                        % type(server_hostname).__name__)
    return b


# ------------------------------------------------------------ _SSLSocket

# The largest TLS record: 5-byte header + 2^14 plaintext + 2048 expansion.
_MAX_RECORD = 5 + 16384 + 2048


class _SSLSocket:
    """An SSL connection (Modules/_ssl.c _ssl._SSLSocket).

    Always over memory BIOs.  With a socket, WANT_READ is satisfied by
    reading ciphertext from the socket and WANT_WRITE never happens (the
    output BIO takes everything, and _flush sends it); with MemoryBIOs of the
    caller's, both are reported, exactly as _ssl.c reports them for a
    non-blocking socket.
    """

    def __init__(self, *args, **kwargs):
        raise TypeError("cannot create '_ssl._SSLSocket' instances")

    @classmethod
    def _create(cls, sslctx, sock, server_side, server_hostname, extras):
        # (owner, session, inbio, outbio) arrive as ONE tuple: Grail cannot
        # find a class-side method with more than six parameters after cls
        # (its attribute lookup knows selectors up to six arguments).
        owner, session, inbio, outbio = extras
        if server_side and sslctx._protocol == PROTOCOL_TLS_CLIENT:
            raise _ssl_error('Cannot create a server socket with a '
                             'PROTOCOL_TLS_CLIENT context')
        if not server_side and sslctx._protocol == PROTOCOL_TLS_SERVER:
            raise _ssl_error('Cannot create a client socket with a '
                             'PROTOCOL_TLS_SERVER context')
        self = object.__new__(cls)
        self._ctx = sslctx
        self._ssl = None
        self._sock = None
        self._owner = None
        self._server_hostname = None
        self._shutdown_seen_zero = False
        self._err = 0
        self._outbuf = b''
        self._eof_seen = False
        self._record_head = b''      # header bytes of the record being read
        self._record_body_left = 0   # its body bytes not yet read
        L.ERR_clear_error()
        ssl = L.SSL_new(sslctx._ctx)
        if ssl is None:
            raise _ssl_error()
        self._ssl = ssl
        self._server_side = server_side
        if server_side:
            sid = _C.from_bytes(b'Python\x00')
            L.SSL_set_session_id_context(ssl, sid, 7)
        if sock is not None:
            rbio = _new_mem_bio()
            wbio = _new_mem_bio()
            L.BIO_set_flags(rbio, K.BIO_FLAGS_READ | K.BIO_FLAGS_SHOULD_RETRY)
            L.BIO_ctrl(rbio, K.BIO_C_SET_BUF_MEM_EOF_RETURN, -1, None)
            L.BIO_ctrl(wbio, K.BIO_C_SET_BUF_MEM_EOF_RETURN, -1, None)
            L.SSL_set_bio(ssl, rbio, wbio)
            self._rbio = rbio
            self._wbio = wbio
        else:
            L.BIO_up_ref(inbio._bio)
            L.BIO_up_ref(outbio._bio)
            L.SSL_set_bio(ssl, inbio._bio, outbio._bio)
            self._rbio = inbio._bio
            self._wbio = outbio._bio
        L.SSL_ctrl(ssl, K.SSL_CTRL_MODE,
                 K.SSL_MODE_ACCEPT_MOVING_WRITE_BUFFER | K.SSL_MODE_AUTO_RETRY, None)
        if sslctx._post_handshake_auth:
            if server_side:
                mode = L.SSL_get_verify_mode(ssl)
                if mode & K.SSL_VERIFY_PEER:
                    L.SSL_set_verify(ssl, mode | K.SSL_VERIFY_POST_HANDSHAKE, None)
            else:
                L.SSL_set_post_handshake_auth(ssl, 1)
        if server_hostname is not None:
            self._configure_hostname(server_hostname)
        if server_side:
            L.SSL_set_accept_state(ssl)
        else:
            L.SSL_set_connect_state(ssl)
        if sock is not None:
            try:
                self._sock = _weakref.ref(sock)
            except TypeError:
                self._sock = lambda sock=sock: sock
        if owner is not None:
            self.owner = owner
        if session is not None:
            self.session = session
        return self

    def __del__(self):
        ssl = getattr(self, '_ssl', None)
        if ssl is not None:
            self._ssl = None
            L.SSL_set_shutdown(ssl, K.SSL_SENT_SHUTDOWN | L.SSL_get_shutdown(ssl))
            L.SSL_free(ssl)

    def _configure_hostname(self, server_hostname):
        if len(server_hostname) == 0 or server_hostname.startswith(b'.'):
            raise ValueError('server_hostname cannot be an empty string or start '
                             'with a leading dot.')
        ip = L.a2i_IPADDRESS(server_hostname)
        if ip is None:
            L.ERR_clear_error()
        try:
            self._server_hostname = server_hostname.decode('ascii')
            if ip is None:
                if not L.SSL_ctrl(self._ssl, K.SSL_CTRL_SET_TLSEXT_HOSTNAME,
                                _TLSEXT_NAMETYPE_host_name, server_hostname):
                    raise _ssl_error()
            if self._ctx._check_hostname:
                params = L.SSL_get0_param(self._ssl)
                if ip is None:
                    if not L.X509_VERIFY_PARAM_set1_host(params, server_hostname,
                                                       len(server_hostname)):
                        raise _ssl_error()
                else:
                    if not L.X509_VERIFY_PARAM_set1_ip(params, L.ASN1_STRING_get0_data(ip),
                                                     L.ASN1_STRING_length(ip)):
                        raise _ssl_error()
        finally:
            if ip is not None:
                L.ASN1_OCTET_STRING_free(ip)

    # -- the socket pump ---------------------------------------------

    def _get_socket(self):
        """GET_SOCKET: None for a BIO connection, raise if the socket is gone."""
        if self._sock is None:
            return None
        sock = self._sock()
        if sock is None:
            raise _ssl_error('Underlying socket connection gone')
        return sock

    def _flush(self, sock, timeout=None, deadline=None, op='write'):
        """Send whatever OpenSSL has written to the output BIO.  Answer True
        once all of it is out, False when a NON-BLOCKING socket is full: the
        rest stays in self._outbuf, the stand-in for the kernel buffer a
        socket BIO would have filled, and goes out first on the next call.

        A blocking or timed socket waits for room, up to its deadline.  The
        ciphertext cannot be dropped -- OpenSSL has already produced it."""
        pending = L.BIO_ctrl_pending(self._wbio)
        if pending:
            buf = _C.malloc(pending)
            n = L.BIO_read(self._wbio, buf, pending)
            if n > 0:
                self._outbuf += _C.read(buf, 0, n)
        while self._outbuf:
            try:
                sent = _socket.socket.send(sock, self._outbuf, 0)
            except (BlockingIOError, TimeoutError):
                if timeout == 0:
                    return False
                wait = 1.0
                if deadline is not None:
                    remaining = deadline - _time.monotonic()
                    if remaining <= 0:
                        raise TimeoutError('The %s operation timed out' % op) from None
                    wait = min(wait, remaining)
                import select
                select.select([], [sock], [], wait)
                continue
            self._outbuf = self._outbuf[sent:]
        return True

    def _fill(self, sock, timeout, deadline, op):
        """Read ciphertext from the socket into the input BIO.  Answer True
        when data (or EOF) arrived, False when a non-blocking socket had
        none -- the caller then reports WANT_READ.

        Never past the end of the current TLS record, which is how OpenSSL's
        socket BIO reads with read-ahead off: whatever follows stays in the
        kernel buffer, where select() can see it and whoever unwraps the
        socket after close_notify can read it.  Reading ahead into the memory
        BIO instead hid the peer's first application data behind the
        handshake's last record -- pending() is 0 for undecrypted bytes and
        the socket was drained, so an asyncore server never woke
        (test_asyncore_server).  Each chunk still goes into the BIO as it
        arrives, so a peer that is not speaking TLS is refused on its first
        five bytes rather than waited on for a record length it made up."""
        if self._eof_seen:
            return False
        if sock.fileno() == -1:
            raise SSLError('Underlying socket has been closed.')
        want = self._record_remaining()
        try:
            data = self._recv_timed(sock, want, timeout, deadline, op)
        except BlockingIOError:
            return False
        if not data:
            # EOF: from now on the input BIO answers 0, not ``retry''.
            self._eof_seen = True
            L.BIO_clear_flags(self._rbio, K.BIO_FLAGS_RWS | K.BIO_FLAGS_SHOULD_RETRY)
            L.BIO_ctrl(self._rbio, K.BIO_C_SET_BUF_MEM_EOF_RETURN, 0, None)
            return True
        self._note_record_bytes(data)
        L.BIO_write(self._rbio, data, len(data))
        return True

    def _record_remaining(self):
        """Bytes left in the TLS record being read: the rest of its five-byte
        header, or the rest of its body once the header is in."""
        head = self._record_head
        if len(head) < 5:
            return 5 - len(head)
        return self._record_body_left

    def _note_record_bytes(self, data):
        while data:
            head = self._record_head
            if len(head) < 5:
                take = 5 - len(head)
                head += data[:take]
                data = data[take:]
                self._record_head = head
                if len(head) == 5:
                    self._record_body_left = (head[3] << 8) | head[4]
            else:
                take = min(self._record_body_left, len(data))
                self._record_body_left -= take
                data = data[take:]
            if len(self._record_head) == 5 and self._record_body_left == 0:
                self._record_head = b''

    def _recv_timed(self, sock, n, timeout, deadline, op):
        if timeout is None or timeout == 0:
            return self._recv(sock, n)
        remaining = deadline - _time.monotonic()
        if remaining <= 0:
            raise TimeoutError('The %s operation timed out' % op)
        _socket.socket.settimeout(sock, remaining)
        try:
            return self._recv(sock, n)
        except TimeoutError:
            raise TimeoutError('The %s operation timed out' % op) from None
        finally:
            _socket.socket.settimeout(sock, timeout)

    def _recv(self, sock, n):
        # Flags spelled out: the one-argument _socket.socket.recv is a Grail
        # forwarder that re-sends ``recv:_:'' to its receiver, and for an
        # SSLSocket receiver that virtual send lands on ssl.SSLSocket.recv --
        # which reads through this engine again, without end.  Likewise
        # send() in _flush.
        return _socket.socket.recv(sock, n, 0)

    def _run(self, attempt, failed, op):
        """The retry loop every operation in _ssl.c has: call OpenSSL, and on
        WANT_READ / WANT_WRITE wait on the socket and try again.  Answers the
        last return value; self._err holds L.SSL_get_error() for it."""
        sock = self._get_socket()
        timeout = None if sock is None else sock.gettimeout()
        deadline = None
        if timeout:
            deadline = _time.monotonic() + timeout
        if sock is not None and self._outbuf:
            # Ciphertext from an earlier call is still waiting for room.  Until
            # it is out, nothing new is taken: this is WANT_WRITE, as a socket
            # BIO answers when the kernel buffer is full (test_nonblocking_send).
            # 0 is a failure for every caller: SSL_*_ex, and handshake's r < 1.
            if not self._flush(sock, timeout, deadline, op):
                self._err = SSL_ERROR_WANT_WRITE
                return 0
        while True:
            ret = attempt()
            self._err = L.SSL_get_error(self._ssl, ret) if failed(ret) else 0
            if sock is None:
                return ret
            self._flush(sock, timeout, deadline, op)
            if self._err == SSL_ERROR_WANT_READ:
                if not self._fill(sock, timeout, deadline, op):
                    return ret
                continue
            if self._err == SSL_ERROR_WANT_WRITE:
                continue
            return ret

    def _set_error(self):
        """PySSL_SetError(): the exception for self._err."""
        e = L.ERR_peek_last_error()
        type_ = SSLError
        p = K.PY_SSL_ERROR_NONE
        errstr = None
        err = self._err
        if err == SSL_ERROR_ZERO_RETURN:
            errstr = 'TLS/SSL connection has been closed (EOF)'
            type_ = SSLZeroReturnError
            p = SSL_ERROR_ZERO_RETURN
        elif err == SSL_ERROR_WANT_READ:
            errstr = 'The operation did not complete (read)'
            type_ = SSLWantReadError
            p = SSL_ERROR_WANT_READ
        elif err == SSL_ERROR_WANT_WRITE:
            p = SSL_ERROR_WANT_WRITE
            type_ = SSLWantWriteError
            errstr = 'The operation did not complete (write)'
        elif err == SSL_ERROR_WANT_X509_LOOKUP:
            p = SSL_ERROR_WANT_X509_LOOKUP
            errstr = 'The operation did not complete (X509 lookup)'
        elif err == SSL_ERROR_WANT_CONNECT:
            p = SSL_ERROR_WANT_CONNECT
            errstr = 'The operation did not complete (connect)'
        elif err == SSL_ERROR_SYSCALL:
            if e == 0:
                L.ERR_clear_error()
                p = SSL_ERROR_EOF
                type_ = SSLEOFError
                errstr = 'EOF occurred in violation of protocol'
            else:
                if _err_lib(e) == K.ERR_LIB_SSL and _err_reason(e) == K.SSL_R_CERTIFICATE_VERIFY_FAILED:
                    type_ = SSLCertVerificationError
                if _err_lib(e) == K.ERR_LIB_SYS:
                    L.ERR_clear_error()
                    en = _err_reason(e)
                    return OSError(en, _os.strerror(en))
                p = SSL_ERROR_SYSCALL
        elif err == SSL_ERROR_SSL:
            p = SSL_ERROR_SSL
            if e == 0:
                errstr = 'A failure in the SSL library occurred'
            if _err_lib(e) == K.ERR_LIB_SSL and _err_reason(e) == K.SSL_R_CERTIFICATE_VERIFY_FAILED:
                type_ = SSLCertVerificationError
            if _err_lib(e) == K.ERR_LIB_SSL and _err_reason(e) == K.SSL_R_UNEXPECTED_EOF_WHILE_READING:
                p = SSL_ERROR_EOF
                type_ = SSLEOFError
                errstr = 'EOF occurred in violation of protocol'
            if _err_lib(e) == K.ERR_LIB_SYS:
                L.ERR_clear_error()
                en = _err_reason(e)
                return OSError(en, _os.strerror(en))
        else:
            p = SSL_ERROR_INVALID_ERROR_CODE
            errstr = 'Invalid error code'
        exc = _fill_and_make(type_, p, errstr, 0, e, self)
        L.ERR_clear_error()
        return exc

    # -- operations ---------------------------------------------------

    def do_handshake(self):
        ret = self._run(lambda: L.SSL_do_handshake(self._ssl), lambda r: r < 1,
                        'handshake')
        if ret < 1:
            raise self._set_error()

    def write(self, b):
        data = bytes(memoryview(b))
        count = _C.malloc(8)
        ret = self._run(lambda: L.SSL_write_ex(self._ssl, data, len(data), count),
                        lambda r: r == 0, 'write')
        if ret == 0:
            raise self._set_error()
        return _C.read_int(count, 0, 8, False)

    def pending(self):
        count = L.SSL_pending(self._ssl)
        if count < 0:
            self._err = L.SSL_get_error(self._ssl, count)
            raise self._set_error()
        return count

    def read(self, size, buffer=None):
        if buffer is None:
            if size < 0:
                raise ValueError('size should not be negative')
            if size == 0:
                return b''
            length = size
        else:
            # _ssl.c takes the buffer as raw bytes (Py_buffer "w*"): its byte
            # length, whatever the item format, and never len(buffer) -- an
            # array('I') holds 4 bytes an item, and a bytearray subclass may
            # override __len__ (test_recv_into_buffer_protocol_len).
            view = memoryview(buffer)
            if view.format != 'B' or view.ndim != 1:
                view = view.cast('B')
            if size <= 0 or size > view.nbytes:
                size = view.nbytes
            if size == 0:
                return 0
            length = size
        mem = _C.malloc(length)
        count = _C.malloc(8)

        def attempt():
            return L.SSL_read_ex(self._ssl, mem, length, count)

        def failed(r):
            return r == 0

        ret = self._run(attempt, failed, 'read')
        if ret == 0:
            if (self._err == SSL_ERROR_ZERO_RETURN and
                    L.SSL_get_shutdown(self._ssl) == K.SSL_RECEIVED_SHUTDOWN):
                n = 0
            else:
                raise self._set_error()
        else:
            n = _C.read_int(count, 0, 8, False)
        data = _C.read(mem, 0, n) if n else b''
        if buffer is None:
            return data
        view[:n] = data
        return n

    def shutdown(self):
        sock = self._get_socket()
        if sock is not None and sock.fileno() == -1:
            raise _ssl_error('Underlying socket connection gone')
        zeros = 0
        timeout = None if sock is None else sock.gettimeout()
        deadline = _time.monotonic() + timeout if timeout else None
        while True:
            if self._shutdown_seen_zero:
                L.SSL_set_read_ahead(self._ssl, 0)
            ret = L.SSL_shutdown(self._ssl)
            self._err = L.SSL_get_error(self._ssl, ret) if ret < 0 else 0
            if sock is not None and not self._flush(sock, timeout, deadline, 'shutdown'):
                # A full non-blocking socket: close_notify is queued, not sent.
                self._err = SSL_ERROR_WANT_WRITE
                ret = -1
                break
            if ret > 0:
                break
            if ret == 0:
                zeros += 1
                if zeros > 1:
                    break
                self._shutdown_seen_zero = True
                continue
            if self._err == SSL_ERROR_WANT_READ:
                if sock is None or not self._fill(sock, timeout, deadline, 'read'):
                    break
            elif self._err == SSL_ERROR_WANT_WRITE:
                if sock is None:
                    break
            else:
                break
        if ret < 0:
            raise self._set_error()
        return sock

    def getpeercert(self, der=False):
        if not L.SSL_is_init_finished(self._ssl):
            raise ValueError('handshake not done yet')
        peer = L.SSL_get1_peer_certificate(self._ssl)
        if peer is None:
            return None
        try:
            if der:
                return _certificate_to_der(peer)
            mode = L.SSL_CTX_get_verify_mode(L.SSL_get_SSL_CTX(self._ssl))
            if (mode & K.SSL_VERIFY_PEER) == 0:
                return {}
            return _decode_certificate(peer)
        finally:
            L.X509_free(peer)

    def get_verified_chain(self):
        chain = L.SSL_get0_verified_chain(self._ssl)
        if chain is None:
            return None
        return _certs_from_stack(chain, 1)

    def get_unverified_chain(self):
        chain = L.SSL_get_peer_cert_chain(self._ssl)
        if chain is None:
            return None
        certs = _certs_from_stack(chain, 1)
        if self._server_side:
            peer = L.SSL_get1_peer_certificate(self._ssl)
            certs.insert(0, None if peer is None else Certificate._from_x509(peer, 0))
        return certs

    def shared_ciphers(self):
        server = L.SSL_get_ciphers(self._ssl)
        if server is None:
            return None
        client = L.SSL_get_client_ciphers(self._ssl)
        if client is None:
            return None
        client_ids = {L.SSL_CIPHER_get_id(L.OPENSSL_sk_value(client, i))
                      for i in range(L.OPENSSL_sk_num(client))}
        out = []
        for i in range(L.OPENSSL_sk_num(server)):
            c = L.OPENSSL_sk_value(server, i)
            if L.SSL_CIPHER_get_id(c) in client_ids:
                out.append(_cipher_to_tuple(c))
        return out

    def cipher(self):
        current = L.SSL_get_current_cipher(self._ssl)
        if current is None:
            return None
        return _cipher_to_tuple(current)

    def version(self):
        if not L.SSL_is_init_finished(self._ssl):
            return None
        v = _cstr(L.SSL_get_version(self._ssl))
        return None if v == 'unknown' else v

    def selected_alpn_protocol(self):
        out = _C.malloc(8)
        outlen = _C.malloc(4)
        L.SSL_get0_alpn_selected(self._ssl, out, outlen)
        p = _C.read_ptr(out, 0)
        n = _C.read_int(outlen, 0, 4, False)
        if p is None or n == 0:
            return None
        return _C.read(p, 0, n).decode('utf-8', 'surrogateescape')

    def compression(self):
        return None

    def get_channel_binding(self, cb_type='tls-unique'):
        if cb_type != 'tls-unique':
            raise ValueError("'%s' channel binding type not implemented" % cb_type)
        buf = _C.malloc(64)
        if bool(L.SSL_session_reused(self._ssl)) ^ (not self._server_side):
            n = L.SSL_get_finished(self._ssl, buf, 64)
        else:
            n = L.SSL_get_peer_finished(self._ssl, buf, 64)
        if n == 0:
            return None
        return _C.read(buf, 0, n)

    def verify_client_post_handshake(self):
        if L.SSL_verify_client_post_handshake(self._ssl) == 0:
            raise _ssl_error()

    # -- attributes ---------------------------------------------------

    @property
    def context(self):
        return self._ctx

    @context.setter
    def context(self, value):
        if not isinstance(value, _SSLContext):
            raise TypeError('The value must be a SSLContext')
        self._ctx = value
        L.SSL_set_SSL_CTX(self._ssl, value._ctx)

    @property
    def server_side(self):
        return self._server_side

    @property
    def server_hostname(self):
        return self._server_hostname

    @property
    def owner(self):
        if self._owner is None:
            return None
        return self._owner()

    @owner.setter
    def owner(self, value):
        try:
            self._owner = _weakref.ref(value)
        except TypeError:
            self._owner = lambda value=value: value

    @property
    def session(self):
        session = L.SSL_get1_session(self._ssl)
        if session is None:
            return None
        return SSLSession._wrap(self._ctx, session)

    @session.setter
    def session(self, value):
        if not isinstance(value, SSLSession):
            raise TypeError('Value is not a SSLSession.')
        if _C.address(self._ctx._ctx) != _C.address(value._ctx._ctx):
            raise ValueError('Session refers to a different SSLContext.')
        if self._server_side:
            raise ValueError('Cannot set session for server-side SSLSocket.')
        if L.SSL_is_init_finished(self._ssl):
            raise ValueError('Cannot set session after handshake.')
        if L.SSL_set_session(self._ssl, value._session) == 0:
            raise _ssl_error()

    @property
    def session_reused(self):
        return bool(L.SSL_session_reused(self._ssl))


_SSLSocket.__module__ = '_ssl'


# ------------------------------------------------------------ module functions

def RAND_add(string, entropy):
    if isinstance(string, str):
        data = string.encode('utf-8')
    else:
        data = bytes(memoryview(string))
    L.RAND_add_(data, len(data), float(entropy))


def RAND_bytes(n):
    if n < 0:
        raise ValueError('num must be positive')
    if n == 0:
        return b''
    buf = _C.malloc(n)
    if L.RAND_bytes_(buf, n) == 1:
        return _C.read(buf, 0, n)
    err = L.ERR_get_error()
    raise SSLError(err, _cstr(L.ERR_reason_error_string(err)))


def RAND_status():
    return bool(L.RAND_status_())


def _openssl_default_verify_paths():
    """OpenSSL's own answer: the env-var names and the compiled-in paths."""
    def conv(b):
        return None if b is None else _os.fsdecode(b)
    return (conv(L.X509_get_default_cert_file_env()),
            conv(L.X509_get_default_cert_file()),
            conv(L.X509_get_default_cert_dir_env()),
            conv(L.X509_get_default_cert_dir()))


def _platform_ca_file():
    return next((p for p in _PLATFORM_CA_FILES if _os.path.isfile(p)), None)


def _platform_ca_dir():
    return next((p for p in _PLATFORM_CA_DIRS if _os.path.isdir(p)), None)


def get_default_verify_paths():
    """The paths set_default_verify_paths trusts.  Where GemStone's
    compiled-in location is absent (see set_default_verify_paths), that is the
    platform bundle, so report it: CPython's own build names the platform
    store here, and ssl.get_default_verify_paths() answering a nonexistent
    /usr/local/ssl would describe a trust store that is never loaded."""
    file_env, cafile, dir_env, capath = _openssl_default_verify_paths()
    if not ((cafile and _os.path.isfile(cafile)) or
            (capath and _os.path.isdir(capath))):
        cafile = _platform_ca_file() or cafile
        capath = _platform_ca_dir() or capath
    return (file_env, cafile, dir_env, capath)


def _asn1obj_tuple(obj):
    nid = L.OBJ_obj2nid(obj)
    if nid == _NID_undef:
        raise ValueError('Unknown object')
    return (nid, _cstr(L.OBJ_nid2sn(nid)), _cstr(L.OBJ_nid2ln(nid)), _asn1obj2py(obj, 1))


def txt2obj(txt, name=False):
    obj = L.OBJ_txt2obj(txt, 0 if name else 1)
    if obj is None:
        raise ValueError("unknown object '%.100s'" % txt)
    try:
        return _asn1obj_tuple(obj)
    finally:
        L.ASN1_OBJECT_free(obj)


def nid2obj(nid):
    if nid < _NID_undef:
        raise ValueError('NID must be positive.')
    obj = L.OBJ_nid2obj(nid)
    if obj is None:
        raise ValueError('unknown NID %i' % nid)
    try:
        return _asn1obj_tuple(obj)
    finally:
        L.ASN1_OBJECT_free(obj)


# The socket module's C API that _ssl.c imports; ssl.py checks for it.
err_codes_to_names = _ERR_CODES
lib_codes_to_names = _LIB_CODES
