# Probe for Werkzeug Step 4 — werkzeug.wsgi.
#
# WSGI environ helpers: get_current_url, get_host, get_content_length,
# get_input_stream, get_path_info, wrap_file, LimitedStream.
# Three Grail-side patches in the upstream file: ``lambda *args''
# rewritten to closure (PEP-style not yet parsed), io.RawIOBase base
# removed (Grail's io stub doesn't expose it), and the PEP 448
# tuple-unpack worked around in werkzeug.urls.


import werkzeug.wsgi as ww


def import_succeeded():
    return ww is not None


def get_path_info_basic():
    return ww.get_path_info({'PATH_INFO': '/hello/world'})


def get_content_length_with_length():
    return ww.get_content_length({'CONTENT_LENGTH': '42'})


def get_content_length_chunked():
    """Chunked transfer-encoding returns None (streaming)."""
    return ww.get_content_length({
        'CONTENT_LENGTH': '0',
        'HTTP_TRANSFER_ENCODING': 'chunked',
    })
