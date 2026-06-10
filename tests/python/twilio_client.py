# Fixture for TwilioClientTestCase.
#
# Three layers, bottom-up:
#
#   1. requests shim + urllib.request.urlopen against an in-process
#      green-thread HTTP server (threading.Thread + Grail sockets).
#   2. twilio's real TwilioHttpClient (driving the requests shim)
#      against the same loopback server.
#   3. The full twilio Client resource path with a fake transport:
#      client.messages.create(...) -> MessageList -> Version.create ->
#      ClientBase.request -> canned Response -> MessageInstance.
#
# Layer 3 is offline (no sockets) and asserts the exact HTTP request
# twilio composes: method, URL, form data, and basic-auth credentials.

import json
import logging
import socket
import threading

import requests
from urllib.error import HTTPError
from urllib.request import urlopen

from twilio.base.exceptions import TwilioRestException

from twilio.rest import Client
from twilio.http import HttpClient
from twilio.http.http_client import TwilioHttpClient
from twilio.http.response import Response


# --- green-thread loopback server -----------------------------------

def _spawn_server(canned):
    """Listen on an ephemeral port; serve exactly one request with the
    canned bytes on a background green thread.  Returns (port, seen,
    thread) where seen[0] becomes the raw request text."""
    srv = socket.socket()
    srv.bind(('127.0.0.1', 0))
    srv.listen(1)
    port = srv.getsockname()[1]
    seen = []

    def run():
        conn, addr = srv.accept()
        data = b''
        while b'\r\n\r\n' not in data:
            chunk = conn.recv(8192)
            if not chunk:
                break
            data = data + chunk
        head, _, body = data.partition(b'\r\n\r\n')
        text = head.decode('utf-8')
        lower = text.lower()
        if 'content-length:' in lower:
            marker = lower.find('content-length:')
            line_end = text.find('\r\n', marker)
            if line_end == -1:
                line_end = len(text)
            length = int(
                text[marker + len('content-length:'):line_end].strip())
            while len(body) < length:
                chunk = conn.recv(8192)
                if not chunk:
                    break
                body = body + chunk
        seen.append(text + '\r\n\r\n' + body.decode('utf-8'))
        conn.sendall(canned)
        conn.close()
        srv.close()

    thread = threading.Thread(target=run)
    thread.start()
    return port, seen, thread


# --- layer 1a: requests shim ----------------------------------------

def requests_get():
    port, seen, thread = _spawn_server(
        b'HTTP/1.1 200 OK\r\n'
        b'Content-Type: application/json\r\n'
        b'Content-Length: 17\r\n'
        b'Connection: close\r\n'
        b'\r\n'
        b'{"hello": "json"}')
    resp = requests.get('http://127.0.0.1:' + str(port) + '/info',
                        params={'q': 'a b'}, auth=('user', 'secret'))
    thread.join()
    request_text = seen[0]
    return {
        'status': resp.status_code,
        'ok': resp.ok,
        'json': resp.json(),
        'ctype': resp.headers.get('content-type'),
        'sent_query': 'GET /info?q=a+b HTTP/1.1' in request_text,
        'sent_auth': 'Authorization: Basic dXNlcjpzZWNyZXQ=' in request_text,
    }


# --- layer 1b: urlopen ----------------------------------------------

def urlopen_get():
    port, seen, thread = _spawn_server(
        b'HTTP/1.1 200 OK\r\n'
        b'Content-Length: 5\r\n'
        b'Connection: close\r\n'
        b'\r\n'
        b'grail')
    resp = urlopen('http://127.0.0.1:' + str(port) + '/plain')
    body = resp.read().decode('utf-8')
    thread.join()
    return {
        'status': resp.status,
        'body': body,
        'url': resp.geturl(),
    }


def urlopen_error():
    port, seen, thread = _spawn_server(
        b'HTTP/1.1 404 Not Found\r\n'
        b'Content-Length: 4\r\n'
        b'Connection: close\r\n'
        b'\r\n'
        b'gone')
    try:
        urlopen('http://127.0.0.1:' + str(port) + '/missing')
        result = 'no-error'
    except HTTPError as exc:
        result = 'HTTPError:%s' % (exc.code,)
    thread.join()
    return result


# --- layer 2: TwilioHttpClient over the requests shim ----------------

def twilio_http_client_roundtrip():
    port, seen, thread = _spawn_server(
        b'HTTP/1.1 201 Created\r\n'
        b'Content-Type: application/json\r\n'
        b'Content-Length: 16\r\n'
        b'Connection: close\r\n'
        b'\r\n'
        b'{"sid": "SM123"}')
    client = TwilioHttpClient()
    resp = client.request(
        'POST', 'http://127.0.0.1:' + str(port) + '/v1/Things',
        data={'Body': 'hi there', 'To': '+15551230000'},
        auth=('ACxx', 'tok'), timeout=30)
    thread.join()
    request_text = seen[0]
    return {
        'status': resp.status_code,
        'text': resp.text,
        'posted_form':
            'Body=hi+there' in request_text and
            'To=%2B15551230000' in request_text,
        'form_ctype':
            'Content-Type: application/x-www-form-urlencoded'
            in request_text,
        'authed': 'Authorization: Basic ' in request_text,
    }


# --- layer 3: full Client resource path with a fake transport --------

class FakeTransport(HttpClient):
    """Records every request and plays back a canned twilio Response."""

    def __init__(self):
        super().__init__(logging.getLogger('fake'), False, None)
        self.calls = []
        self.next_status = 201
        self.next_payload = {}

    def request(self, method, url, params=None, data=None, headers=None,
                auth=None, timeout=None, allow_redirects=False):
        self.calls.append({
            'method': method, 'url': url, 'params': params,
            'data': data, 'headers': headers, 'auth': auth,
        })
        return Response(self.next_status, json.dumps(self.next_payload), {})


def messages_create():
    transport = FakeTransport()
    transport.next_status = 201
    transport.next_payload = {
        'sid': 'SM00000000000000000000000000000042',
        'account_sid': 'AC00000000000000000000000000000001',
        'to': '+15558675310',
        'from': '+15017122661',
        'body': 'Hello from Grail',
        'status': 'queued',
        'num_segments': '1',
        'direction': 'outbound-api',
        'price': None,
        'price_unit': 'USD',
        'api_version': '2010-04-01',
        'uri': '/2010-04-01/Accounts/AC0000.../Messages/SM0000...json',
        'date_created': 'Mon, 09 Jun 2026 21:05:00 +0000',
        'date_updated': 'Mon, 09 Jun 2026 21:05:00 +0000',
        'date_sent': None,
        'error_code': None,
        'error_message': None,
        'messaging_service_sid': None,
        'num_media': '0',
        'subresource_uris': {},
        'tags': {},
    }

    client = Client('AC00000000000000000000000000000001', 'authtoken99',
                    http_client=transport)
    message = client.messages.create(
        to='+15558675310',
        from_='+15017122661',
        body='Hello from Grail')

    call = transport.calls[0]
    return {
        'method': call['method'],
        'url': call['url'],
        'data_to': call['data'].get('To'),
        'data_from': call['data'].get('From'),
        'data_body': call['data'].get('Body'),
        'auth': list(call['auth']) if call['auth'] else None,
        'msg_sid': message.sid,
        'msg_status': message.status,
        'msg_body': message.body,
        'msg_num_segments': message.num_segments,
        'date_created_year': message.date_created.year
            if message.date_created else None,
    }


def messages_create_error():
    """A 400 from the API must surface as TwilioRestException with the
    twilio error payload decoded."""
    transport = FakeTransport()
    transport.next_status = 400
    transport.next_payload = {
        'code': 21211,
        'message': "The 'To' number is not a valid phone number.",
        'more_info': 'https://www.twilio.com/docs/errors/21211',
        'status': 400,
    }
    client = Client('AC00000000000000000000000000000001', 'authtoken99',
                    http_client=transport)
    try:
        client.messages.create(to='bogus', from_='+15017122661', body='x')
        return 'no-error'
    except TwilioRestException as exc:
        return {'name': 'TwilioRestException',
                'code': exc.code, 'status': exc.status}


r_requests = requests_get()
r_urlopen = urlopen_get()
r_urlopen_error = urlopen_error()
r_twilio_http = twilio_http_client_roundtrip()
r_create = messages_create()
r_create_error = messages_create_error()
