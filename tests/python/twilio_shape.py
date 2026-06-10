# Fixture for TwilioShapeTestCase.
#
# Models the class shapes the twilio SDK relies on, distilled from
# twilio/base/*.py and a generated resource module
# (twilio/rest/api/v2010/account/message/__init__.py), so we know the
# class system can carry the real package before vendoring it:
#
#   * user-class single inheritance with super().__init__ chains
#     (Domain -> Api, Version -> V2010, InstanceResource ->
#     MessageInstance, ListResource -> MessageList)
#   * inherited methods invoked on subclass instances
#   * @property for lazy sub-objects (Client.api / Api.v2010 pattern)
#   * @classmethod invoked through the instance (self.exception /
#     self.process_response — every classmethod call on twilio's sync
#     REST path goes through self, never the class).  Grail ignores
#     the decorator and compiles an instance method, which is
#     call-compatible for this shape; calling on the CLASS
#     (Version.exception(...)) is the known gap (TODO.md
#     "No @classmethod") and is deliberately not used here.
#   * iterator protocol on a base class delegating to a subclass
#     override (Page.__next__ -> get_instance)
#   * NotImplementedError base-method override pattern


class Response:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text


class Domain:
    def __init__(self, base_url):
        self.base_url = base_url

    def absolute_url(self, uri):
        return self.base_url + '/' + uri


class Api(Domain):
    def __init__(self):
        super().__init__('https://api.twilio.com')
        self._v2010 = None

    @property
    def v2010(self):
        if self._v2010 is None:
            self._v2010 = V2010(self)
        return self._v2010


class Version:
    def __init__(self, domain, version):
        self.domain = domain
        self.version = version

    def relative_uri(self, uri):
        return self.version + '/' + uri.strip('/')

    def absolute_url(self, uri):
        return self.domain.absolute_url(self.relative_uri(uri))

    @classmethod
    def exception(cls, method, uri, message):
        return ValueError(method + ' ' + uri + ': ' + message)


class V2010(Version):
    def __init__(self, domain):
        super().__init__(domain, '2010-04-01')


class InstanceResource(object):
    def __init__(self, version):
        self._version = version


class MessageInstance(InstanceResource):
    def __init__(self, version, payload, account_sid):
        super().__init__(version)
        self.body = payload.get('body')
        self.sid = payload.get('sid')
        self._solution = {'account_sid': account_sid, 'sid': self.sid}


class ListResource(object):
    def __init__(self, version):
        self._version = version


class MessageList(ListResource):
    def __init__(self, version, account_sid):
        super().__init__(version)
        self._solution = {'account_sid': account_sid}
        self._uri = '/Accounts/' + account_sid + '/Messages.json'

    def create(self, body):
        payload = {'body': body, 'sid': 'SM123'}
        return MessageInstance(
            self._version, payload, self._solution['account_sid']
        )


class Page:
    def __init__(self, version, records):
        self._version = version
        self._records = iter(records)

    def __iter__(self):
        return self

    def __next__(self):
        return self.get_instance(next(self._records))

    @classmethod
    def process_response(cls, response):
        if response.status_code != 200:
            raise ValueError('unable to fetch page')
        return response.text

    def get_instance(self, payload):
        raise NotImplementedError('must be implemented by subclass')


class MessagePage(Page):
    def get_instance(self, payload):
        return payload['sid']


# --- exercise the shapes ---

api = Api()
version = api.v2010

# inherited method through two user-defined hops
abs_url = version.absolute_url('Accounts/AC123/Messages.json')
# 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json'

# subclass ctor chain populated state from both levels
version_string = version.version          # '2010-04-01'
domain_base = api.base_url                # 'https://api.twilio.com'

# lazy property caches
same_version = api.v2010 is version       # True

msg_list = MessageList(version, 'AC123')
msg = msg_list.create('hello')
msg_body = msg.body                       # 'hello'
msg_sid = msg.sid                         # 'SM123'
msg_version_is_shared = msg._version is version   # True
list_uri = msg_list._uri                  # '/Accounts/AC123/Messages.json'

# classmethod through the instance — twilio's actual call shape
# (version.py: ``raise self.exception(method, uri, response, msg)``)
exc_text = str(version.exception('POST', '/Messages', 'oops'))
# 'POST /Messages: oops'

# base iterator protocol with override
page = MessagePage(version, [{'sid': 'SM1'}, {'sid': 'SM2'}])
page_sids = [s for s in page]             # ['SM1', 'SM2']

# (page.py: ``payload = self.process_response(response)``)
processed = page.process_response(Response(200, 'payload-text'))
# 'payload-text'

try:
    page.process_response(Response(400, 'nope'))
    process_err = 'no_error'
except ValueError:
    process_err = 'value_error'

# NotImplementedError on the un-overridden base
try:
    Page(version, []).get_instance({})
    base_get_instance = 'no_error'
except NotImplementedError:
    base_get_instance = 'not_implemented'

# isinstance through user-defined parents
inst_checks = [
    isinstance(msg, MessageInstance),
    isinstance(msg, InstanceResource),
    isinstance(api, Domain),
    isinstance(version, Version),
]
