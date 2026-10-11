# Regression fixture for #1422: a keyword call to a private method.
#
# A simple-positional method also gets a varargs ``_name:kw:'' companion so
# keyword call sites can bind.  For a private method (``def __m'' inside a
# class) that companion was compiled under the RAW name while the method and
# every call site use the MANGLED one, so ``self.__m(k=v)'' was an
# uncatchable MessageNotUnderstood that ended the session.  pyasn1 does
# exactly this (namedtype.py, ``self.__computeTagMaps(unique=True)''), which
# stopped 142 of pyasn1 and pyasn1-modules' submodules from importing.
#
# Every shape is called both positionally and by keyword, since the two reach
# different selectors.  Expected values are what CPython 3.14 answers.

RESULTS = {}


class C(object):
    def __plain(self, unique):
        return ('plain', unique)

    def __defaulted(self, x, flag=False):
        return ('defaulted', x, flag)

    def __star(self, *args, **kwargs):
        return ('star', args, sorted(kwargs))

    def plain_calls(self):
        return [self.__plain(True), self.__plain(unique=True)]

    def defaulted_calls(self):
        return [self.__defaulted(1), self.__defaulted(1, True),
                self.__defaulted(1, flag=True), self.__defaulted(x=2)]

    def star_calls(self):
        return [self.__star(1, z=2)]


class Sub(C):
    # Its own __plain mangles to _Sub__plain: a different method from C's.
    def __plain(self, unique):
        return ('sub', unique)

    def own(self):
        return self.__plain(unique=False)


RESULTS['plain_keyword_call'] = C().plain_calls() == [
    ('plain', True), ('plain', True)]
RESULTS['defaulted_keyword_call'] = C().defaulted_calls() == [
    ('defaulted', 1, False), ('defaulted', 1, True),
    ('defaulted', 1, True), ('defaulted', 2, False)]
RESULTS['star_keyword_call'] = C().star_calls() == [('star', (1,), ['z'])]
RESULTS['subclass_keeps_base_private'] = Sub().plain_calls() == [
    ('plain', True), ('plain', True)]
RESULTS['subclass_own_private'] = Sub().own() == ('sub', False)
RESULTS['mangled_name_from_outside'] = C()._C__plain(unique=3) == ('plain', 3)


def unexpected_keyword():
    try:
        C()._C__plain(nope=1)
    except TypeError as e:
        return str(e)
    return 'no error'


RESULTS['unexpected_keyword_is_a_type_error'] = (
    unexpected_keyword() == "C.__plain() got an unexpected keyword argument 'nope'")

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
