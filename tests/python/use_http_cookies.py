# Fixture for HttpCookiesTestCase.
#
# Exercises http.cookies SimpleCookie / BaseCookie / Morsel: setting
# values, value quoting (space-wrap, octal escape), reserved-attribute
# rendering in sorted order, header-string parsing, quote/unquote
# round-tripping, dict construction, and CookieError on bad attrs.
# Results are stashed in the module-level dict ``r``.

# Force a fresh read from disk (sys.modules is committed; a prior
# session may have cached older code).  importlib.reload re-executes
# __file__ in place — evict+import is broken in Grail.
import importlib
import http.cookies
importlib.reload(http.cookies)
from http.cookies import SimpleCookie, BaseCookie, Morsel, CookieError

r = {}

# --- SimpleCookie: basic set + output -------------------------------
c = SimpleCookie()
c['name'] = 'value'
r['basic_value'] = c['name'].value
r['basic_coded'] = c['name'].coded_value
r['basic_key'] = c['name'].key
r['basic_output'] = c.output()
r['basic_str'] = str(c)

# --- reserved attributes render in sorted order ---------------------
c2 = SimpleCookie()
c2['sid'] = 'abc123'
c2['sid']['path'] = '/'
c2['sid']['domain'] = 'example.com'
c2['sid']['httponly'] = True
r['attr_output'] = c2.output()

# --- quoting: space (wrapped) and special char (octal-escaped) ------
c3 = SimpleCookie()
c3['k'] = 'a b'
r['space_value'] = c3['k'].value
r['space_coded'] = c3['k'].coded_value
c4 = SimpleCookie()
c4['k'] = 'a;b'
r['semi_value'] = c4['k'].value
r['semi_coded'] = c4['k'].coded_value

# --- BaseCookie does not quote --------------------------------------
b = BaseCookie()
b['k'] = 'a b'
r['base_coded'] = b['k'].coded_value
r['base_output'] = b.output()

# --- load: multiple name=value pairs --------------------------------
c5 = SimpleCookie()
c5.load('chips=ahoy; vienna=finger')
r['load_chips'] = c5['chips'].value
r['load_vienna'] = c5['vienna'].value

# --- load: attributes attach to the preceding morsel ----------------
c6 = SimpleCookie()
c6.load('key=value; Path=/; Domain=example.com')
r['load_attr_value'] = c6['key'].value
r['load_attr_path'] = c6['key']['path']
r['load_attr_domain'] = c6['key']['domain']

# --- load: a quoted value with an octal escape is decoded -----------
c7 = SimpleCookie()
c7.load('greeting="Hello\\054 World"')   # \054 == comma
r['load_quoted'] = c7['greeting'].value

# --- round-trip a special char through quote then unquote -----------
c8 = SimpleCookie()
c8['x'] = 'p;q'
coded = c8['x'].coded_value
c9 = SimpleCookie()
c9.load('x=' + coded)
r['roundtrip'] = c9['x'].value

# --- construct from a dict ------------------------------------------
c10 = SimpleCookie({'a': '1', 'b': '2'})
r['fromdict_a'] = c10['a'].value
r['fromdict_b'] = c10['b'].value

# --- invalid Morsel attribute raises CookieError --------------------
c11 = SimpleCookie()
c11['k'] = 'v'
try:
    c11['k']['bogus'] = 'x'
    r['invalid_attr_raises'] = False
except CookieError:
    r['invalid_attr_raises'] = True

# --- Morsel direct API ----------------------------------------------
m = Morsel()
m.set('color', 'blue', 'blue')
r['morsel_key'] = m.key
r['morsel_value'] = m.value
r['morsel_reserved'] = m.isReservedKey('Path')
r['morsel_not_reserved'] = m.isReservedKey('bogus')

# --- multiple cookies output, joined and sorted ---------------------
c12 = SimpleCookie()
c12['b'] = '2'
c12['a'] = '1'
lines = c12.output().split('\r\n')
r['multi_count'] = len(lines)
r['multi_line0'] = lines[0]
r['multi_line1'] = lines[1]
