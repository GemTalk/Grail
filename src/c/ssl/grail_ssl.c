/* grail_ssl.c -- the OpenSSL callbacks Grail's _ssl needs.
 *
 * WHY C AT ALL.  src/python/stdlib/_ssl.py drives OpenSSL through CCallout
 * (_grail_openssl.gs), and that covers every call Python makes INTO OpenSSL.
 * It cannot cover the calls OpenSSL makes back OUT: a callback is a C
 * function pointer, and GemStone's way to make one from Smalltalk (CCallin)
 * is unsupported without native code, which Darwin arm64 does not have.
 *
 * WHY NOT A USER ACTION.  A user action can call back into Smalltalk
 * (GciPerform), which looks like the natural way to run a Python callback
 * from inside OpenSSL.  It is not usable here.  Smalltalk run inside a user
 * action may not switch GsProcess -- error 6011, "GsProcess switch not
 * allowed while FFI, UserAction or IntRecur call is active" -- and every
 * Grail thread and every generator body is a GsProcess.  Measured with a PSK
 * callback that ran a generator expression: the 6011, then "execution of
 * ensure blocks would cross frame of C primitive, user action, or FFI call",
 * then a fault in the VM (HostCoreDump).  So no Python runs while OpenSSL
 * is on the C stack.  Instead this is a plain library, called through
 * CCallout like the rest of _ssl, and each callback is answered in one of
 * three ways:
 *
 *   ALPN selection   entirely in C: SSL_select_next_proto over the protocols
 *                    the context was given (_ssl.c's _selectALPN_cb).
 *   msg_callback     QUEUED per SSL, and read out (grail_ssl_take) after the
 *   keylog           OpenSSL call returns; _ssl.py then calls the Python
 *                    callback / writes the keylog file, in the order OpenSSL
 *                    produced them.
 *   PSK              OpenSSL needs the answer before it can go on, so the
 *                    connection runs in ASYNC mode (SSL_MODE_ASYNC): the
 *                    callback records what it was asked, and PAUSES its
 *                    async job.  The SSL call returns SSL_ERROR_WANT_ASYNC;
 *                    _ssl.py reads the request (grail_ssl_psk_request),
 *                    calls the Python callback as ordinary Python, hands the
 *                    answer back (grail_ssl_psk_answer) and repeats the
 *                    call, which resumes the job inside the callback.
 *
 * OPENSSL IS NOT LINKED.  It is dlopen'ed from the path _grail_openssl
 * loads (the libssl GemStone ships, whose file name carries the product
 * version), so both reach the same copy in the gem.  The prototypes are
 * declared here: GemStone ships no OpenSSL headers.
 */

#include <dlfcn.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ------------------------------------------------------------ OpenSSL */

typedef struct ssl_st SSL;
typedef struct ssl_ctx_st SSL_CTX;
typedef struct crypto_ex_data_st CRYPTO_EX_DATA;
typedef struct async_job_st ASYNC_JOB;

typedef int (*alpn_select_cb)(SSL *, const unsigned char **, unsigned char *,
                              const unsigned char *, unsigned int, void *);
typedef void (*keylog_cb)(const SSL *, const char *);
typedef void (*msg_cb)(int, int, int, const void *, size_t, SSL *, void *);
typedef unsigned int (*psk_client_cb)(SSL *, const char *, char *, unsigned int,
                                      unsigned char *, unsigned int);
typedef unsigned int (*psk_server_cb)(SSL *, const char *, unsigned char *,
                                      unsigned int);
typedef void (*ex_free_cb)(void *, void *, CRYPTO_EX_DATA *, int, long, void *);

static struct {
    void (*SSL_CTX_set_alpn_select_cb)(SSL_CTX *, alpn_select_cb, void *);
    int (*SSL_select_next_proto)(unsigned char **, unsigned char *,
                                 const unsigned char *, unsigned int,
                                 const unsigned char *, unsigned int);
    void (*SSL_CTX_set_keylog_callback)(SSL_CTX *, keylog_cb);
    void (*SSL_CTX_set_msg_callback)(SSL_CTX *, msg_cb);
    void (*SSL_set_msg_callback)(SSL *, msg_cb);
    void (*SSL_CTX_set_psk_client_callback)(SSL_CTX *, psk_client_cb);
    void (*SSL_CTX_set_psk_server_callback)(SSL_CTX *, psk_server_cb);
    int (*CRYPTO_get_ex_new_index)(int, long, void *, void *, void *, ex_free_cb);
    int (*SSL_CTX_set_ex_data)(SSL_CTX *, int, void *);
    void *(*SSL_CTX_get_ex_data)(const SSL_CTX *, int);
    int (*SSL_set_ex_data)(SSL *, int, void *);
    void *(*SSL_get_ex_data)(const SSL *, int);
    SSL_CTX *(*SSL_get_SSL_CTX)(const SSL *);
    int (*ASYNC_is_capable)(void);
    ASYNC_JOB *(*ASYNC_get_current_job)(void);
    int (*ASYNC_pause_job)(void);
} F;

enum {
    CRYPTO_EX_INDEX_SSL = 0,
    CRYPTO_EX_INDEX_SSL_CTX = 1,
    SSL_TLSEXT_ERR_OK = 0,
    SSL_TLSEXT_ERR_NOACK = 3,
    OPENSSL_NPN_NEGOTIATED = 1,
};

static int g_ready = 0;
static char g_problem[256] = "grail_ssl_init has not been called";
static int g_ctx_index = -1;      /* SSL_CTX ex_data: struct CtxData */
static int g_ssl_index = -1;      /* SSL ex_data: struct SslData */

/* ------------------------------------------------------------ per-context state */

typedef struct {
    unsigned char *alpn;          /* the server's protocols, wire format */
    unsigned int alpn_len;
} CtxData;

static void ctx_data_free(void *parent, void *ptr, CRYPTO_EX_DATA *ad, int idx,
                          long argl, void *argp)
{
    CtxData *d = (CtxData *)ptr;
    (void)parent; (void)ad; (void)idx; (void)argl; (void)argp;
    if (d == NULL) return;
    free(d->alpn);
    free(d);
}

static CtxData *ctx_data(SSL_CTX *ctx, int create)
{
    CtxData *d = (CtxData *)F.SSL_CTX_get_ex_data(ctx, g_ctx_index);
    if (d == NULL && create) {
        d = (CtxData *)calloc(1, sizeof(CtxData));
        if (d != NULL && !F.SSL_CTX_set_ex_data(ctx, g_ctx_index, d)) {
            free(d);
            d = NULL;
        }
    }
    return d;
}

/* ------------------------------------------------------------ per-connection state */

enum { EVENT_MSG = 0, EVENT_KEYLOG = 1 };

typedef struct Event {
    struct Event *next;
    int kind;
    int write_p;
    int version;
    int content_type;
    size_t len;
    unsigned char data[];
} Event;

/* The record grail_ssl_take writes for each event: kind, write_p (1 byte
 * each), version, content_type (2 bytes each), length (4 bytes), all little
 * endian, then the bytes. */
#define EVENT_HEADER 10

typedef struct {
    Event *head;
    Event *tail;
    size_t queued;                /* bytes grail_ssl_take would write */
    /* PSK: what the paused callback asked, and the answer to resume it with. */
    int psk_pending;              /* -1 none, else 0 client / 1 server */
    char *psk_arg;                /* the hint or identity ("" for none) */
    unsigned char *psk_answer;
    size_t psk_answer_len;
    int psk_answered;
} SslData;

static void ssl_data_free(void *parent, void *ptr, CRYPTO_EX_DATA *ad, int idx,
                          long argl, void *argp)
{
    SslData *d = (SslData *)ptr;
    (void)parent; (void)ad; (void)idx; (void)argl; (void)argp;
    if (d == NULL) return;
    Event *e = d->head;
    while (e != NULL) {
        Event *next = e->next;
        free(e);
        e = next;
    }
    free(d->psk_arg);
    free(d->psk_answer);
    free(d);
}

static SslData *ssl_data(const SSL *ssl, int create)
{
    SslData *d = (SslData *)F.SSL_get_ex_data(ssl, g_ssl_index);
    if (d == NULL && create) {
        d = (SslData *)calloc(1, sizeof(SslData));
        if (d == NULL) return NULL;
        d->psk_pending = -1;
        if (!F.SSL_set_ex_data((SSL *)ssl, g_ssl_index, d)) {
            free(d);
            return NULL;
        }
    }
    return d;
}

static void queue_push(const SSL *ssl, int kind, int write_p, int version,
                       int content_type, const void *data, size_t len)
{
    SslData *d = ssl_data(ssl, 1);
    if (d == NULL) return;
    Event *e = (Event *)malloc(sizeof(Event) + len);
    if (e == NULL) return;
    e->next = NULL;
    e->kind = kind;
    e->write_p = write_p;
    e->version = version;
    e->content_type = content_type;
    e->len = len;
    if (len > 0) memcpy(e->data, data, len);
    if (d->tail != NULL) d->tail->next = e; else d->head = e;
    d->tail = e;
    d->queued += EVENT_HEADER + len;
}

/* ------------------------------------------------------------ the callbacks */

/* _ssl.c's _selectALPN_cb / do_protocol_selection(alpn=1, ...). */
static int on_select_alpn(SSL *ssl, const unsigned char **out, unsigned char *outlen,
                          const unsigned char *client, unsigned int client_len,
                          void *arg)
{
    (void)arg;
    CtxData *d = ctx_data(F.SSL_get_SSL_CTX(ssl), 0);
    const unsigned char *server = (const unsigned char *)"";
    unsigned int server_len = 0;
    if (d != NULL && d->alpn != NULL) {
        server = d->alpn;
        server_len = d->alpn_len;
    }
    if (client == NULL) {
        client = (const unsigned char *)"";
        client_len = 0;
    }
    int ret = F.SSL_select_next_proto((unsigned char **)out, outlen,
                                      server, server_len, client, client_len);
    return ret == OPENSSL_NPN_NEGOTIATED ? SSL_TLSEXT_ERR_OK : SSL_TLSEXT_ERR_NOACK;
}

static void on_keylog(const SSL *ssl, const char *line)
{
    queue_push(ssl, EVENT_KEYLOG, 0, 0, 0, line, strlen(line));
}

static void on_msg(int write_p, int version, int content_type, const void *buf,
                   size_t len, SSL *ssl, void *arg)
{
    (void)arg;
    queue_push(ssl, EVENT_MSG, write_p, version, content_type, buf, len);
}

/* Ask Python: record the question, pause the async job, and answer what
 * grail_ssl_psk_answer left when the job resumes.  Outside a job (a
 * connection not in ASYNC mode) there is no way to ask, so refuse. */
static unsigned char *ask_psk(SSL *ssl, int kind, const char *arg, size_t *len)
{
    *len = 0;
    if (F.ASYNC_get_current_job() == NULL) return NULL;
    SslData *d = ssl_data(ssl, 1);
    if (d == NULL) return NULL;
    free(d->psk_arg);
    free(d->psk_answer);
    d->psk_answer = NULL;
    d->psk_answered = 0;
    d->psk_arg = strdup(arg != NULL ? arg : "");
    if (d->psk_arg == NULL) return NULL;
    d->psk_pending = kind;
    int paused = F.ASYNC_pause_job();
    d->psk_pending = -1;
    free(d->psk_arg);
    d->psk_arg = NULL;
    if (!paused || !d->psk_answered) return NULL;
    unsigned char *answer = d->psk_answer;
    *len = d->psk_answer_len;
    d->psk_answer = NULL;
    d->psk_answered = 0;
    return answer;
}

/* psk_client_callback.  The answer is a 4-byte little-endian identity
 * length, the identity, then the key; empty refuses. */
static unsigned int on_psk_client(SSL *ssl, const char *hint, char *identity,
                                  unsigned int max_identity_len, unsigned char *psk,
                                  unsigned int max_psk_len)
{
    size_t n;
    unsigned char *r = ask_psk(ssl, 0, hint, &n);
    unsigned int answer = 0;
    if (r != NULL && n >= 4) {
        size_t id_len = (size_t)r[0] | ((size_t)r[1] << 8) | ((size_t)r[2] << 16)
                        | ((size_t)r[3] << 24);
        if (id_len <= n - 4) {
            size_t psk_len = n - 4 - id_len;
            if (id_len + 1 <= max_identity_len && psk_len <= max_psk_len) {
                memcpy(identity, r + 4, id_len);
                identity[id_len] = 0;
                memcpy(psk, r + 4 + id_len, psk_len);
                answer = (unsigned int)psk_len;
            }
        }
    }
    free(r);
    return answer;
}

/* psk_server_callback.  The answer is the key; empty refuses. */
static unsigned int on_psk_server(SSL *ssl, const char *identity, unsigned char *psk,
                                  unsigned int max_psk_len)
{
    size_t n;
    unsigned char *r = ask_psk(ssl, 1, identity, &n);
    unsigned int answer = 0;
    if (r != NULL && n <= max_psk_len) {
        memcpy(psk, r, n);
        answer = (unsigned int)n;
    }
    free(r);
    return answer;
}

/* ------------------------------------------------------------ the entry points */

/* dlopen OpenSSL and resolve what this library uses.  1 on success; else 0,
 * and grail_ssl_problem() says why. */
int grail_ssl_init(const char *libssl_path)
{
    if (g_ready) return 1;
    void *h = dlopen(libssl_path, RTLD_NOW | RTLD_GLOBAL);
    if (h == NULL) {
        snprintf(g_problem, sizeof g_problem, "%s", dlerror());
        return 0;
    }
#define RESOLVE(name)                                                        \
    do {                                                                     \
        *(void **)&F.name = dlsym(h, #name);                                 \
        if (F.name == NULL) {                                                \
            snprintf(g_problem, sizeof g_problem, "%s lacks " #name,         \
                     libssl_path);                                           \
            return 0;                                                        \
        }                                                                    \
    } while (0)
    RESOLVE(SSL_CTX_set_alpn_select_cb);
    RESOLVE(SSL_select_next_proto);
    RESOLVE(SSL_CTX_set_keylog_callback);
    RESOLVE(SSL_CTX_set_msg_callback);
    RESOLVE(SSL_set_msg_callback);
    RESOLVE(SSL_CTX_set_psk_client_callback);
    RESOLVE(SSL_CTX_set_psk_server_callback);
    RESOLVE(CRYPTO_get_ex_new_index);
    RESOLVE(SSL_CTX_set_ex_data);
    RESOLVE(SSL_CTX_get_ex_data);
    RESOLVE(SSL_set_ex_data);
    RESOLVE(SSL_get_ex_data);
    RESOLVE(SSL_get_SSL_CTX);
    RESOLVE(ASYNC_is_capable);
    RESOLVE(ASYNC_get_current_job);
    RESOLVE(ASYNC_pause_job);
#undef RESOLVE
    g_ctx_index = F.CRYPTO_get_ex_new_index(CRYPTO_EX_INDEX_SSL_CTX, 0, NULL,
                                            NULL, NULL, ctx_data_free);
    g_ssl_index = F.CRYPTO_get_ex_new_index(CRYPTO_EX_INDEX_SSL, 0, NULL,
                                            NULL, NULL, ssl_data_free);
    if (g_ctx_index < 0 || g_ssl_index < 0) {
        snprintf(g_problem, sizeof g_problem, "CRYPTO_get_ex_new_index failed");
        return 0;
    }
    g_ready = 1;
    g_problem[0] = 0;
    return 1;
}

const char *grail_ssl_problem(void)
{
    return g_problem;
}

/* 1 when a PSK callback can pause its handshake (OpenSSL's ASYNC jobs). */
int grail_ssl_async_capable(void)
{
    return F.ASYNC_is_capable();
}

/* The server's ALPN protocols (wire format), and the selection callback that
 * uses them.  1, or 0 when out of memory. */
int grail_ssl_alpn(SSL_CTX *ctx, const unsigned char *protos, unsigned int len)
{
    CtxData *d = ctx_data(ctx, 1);
    if (d == NULL) return 0;
    unsigned char *copy = (unsigned char *)malloc(len > 0 ? len : 1);
    if (copy == NULL) return 0;
    if (len > 0) memcpy(copy, protos, len);
    free(d->alpn);
    d->alpn = copy;
    d->alpn_len = len;
    F.SSL_CTX_set_alpn_select_cb(ctx, on_select_alpn, NULL);
    return 1;
}

/* Queue OpenSSL's reports for grail_ssl_take, or stop.
 *   which 0: the message callback of an SSL_CTX
 *   which 1: the keylog callback of an SSL_CTX
 *   which 2: the message callback of one SSL (SSL_set_SSL_CTX does not carry
 *            it over) */
int grail_ssl_events(void *p, int which, int on)
{
    switch (which) {
    case 0: F.SSL_CTX_set_msg_callback((SSL_CTX *)p, on ? on_msg : NULL); return 1;
    case 1: F.SSL_CTX_set_keylog_callback((SSL_CTX *)p, on ? on_keylog : NULL); return 1;
    case 2: F.SSL_set_msg_callback((SSL *)p, on ? on_msg : NULL); return 1;
    }
    return 0;
}

/* Install (on) or remove a context's PSK callback: which 0 client, 1 server. */
int grail_ssl_psk(SSL_CTX *ctx, int which, int on)
{
    if (which == 0)
        F.SSL_CTX_set_psk_client_callback(ctx, on ? on_psk_client : NULL);
    else
        F.SSL_CTX_set_psk_server_callback(ctx, on ? on_psk_server : NULL);
    return 1;
}

/* The bytes grail_ssl_take would write now (0: nothing queued). */
size_t grail_ssl_queued(SSL *ssl)
{
    SslData *d = ssl_data(ssl, 0);
    return d == NULL ? 0 : d->queued;
}

/* Write the queued reports into buf, oldest first, and forget them.  Answers
 * the bytes written, or 0 (taking nothing) when cap is too small for all. */
size_t grail_ssl_take(SSL *ssl, unsigned char *buf, size_t cap)
{
    SslData *d = ssl_data(ssl, 0);
    if (d == NULL || d->queued == 0 || d->queued > cap) return 0;
    size_t at = 0;
    Event *e = d->head;
    while (e != NULL) {
        unsigned char *h = buf + at;
        h[0] = (unsigned char)e->kind;
        h[1] = (unsigned char)(e->write_p != 0);
        h[2] = (unsigned char)(e->version & 0xff);
        h[3] = (unsigned char)((e->version >> 8) & 0xff);
        h[4] = (unsigned char)(e->content_type & 0xff);
        h[5] = (unsigned char)((e->content_type >> 8) & 0xff);
        h[6] = (unsigned char)(e->len & 0xff);
        h[7] = (unsigned char)((e->len >> 8) & 0xff);
        h[8] = (unsigned char)((e->len >> 16) & 0xff);
        h[9] = (unsigned char)((e->len >> 24) & 0xff);
        memcpy(h + EVENT_HEADER, e->data, e->len);
        at += EVENT_HEADER + e->len;
        Event *next = e->next;
        free(e);
        e = next;
    }
    d->head = d->tail = NULL;
    d->queued = 0;
    return at;
}

/* The PSK question a paused handshake is waiting on: -1 when none, else 0
 * (client: arg is the server's hint) or 1 (server: arg is the client's
 * identity), with arg copied NUL-terminated into buf (truncated to cap). */
int grail_ssl_psk_request(SSL *ssl, char *buf, size_t cap)
{
    SslData *d = ssl_data(ssl, 0);
    if (d == NULL || d->psk_pending < 0) return -1;
    if (cap > 0) {
        snprintf(buf, cap, "%s", d->psk_arg != NULL ? d->psk_arg : "");
    }
    return d->psk_pending;
}

/* The answer to that question (see on_psk_client / on_psk_server for its
 * shape; empty refuses).  The next SSL call resumes the handshake with it.
 * 1, or 0 when nothing is waiting or out of memory. */
int grail_ssl_psk_answer(SSL *ssl, const unsigned char *data, size_t len)
{
    SslData *d = ssl_data(ssl, 0);
    if (d == NULL || d->psk_pending < 0) return 0;
    unsigned char *copy = (unsigned char *)malloc(len > 0 ? len : 1);
    if (copy == NULL) return 0;
    if (len > 0) memcpy(copy, data, len);
    free(d->psk_answer);
    d->psk_answer = copy;
    d->psk_answer_len = len;
    d->psk_answered = 1;
    return 1;
}
