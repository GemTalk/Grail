# Regression fixture for #1385 and #1214: a step-1 slice is one block copy,
# and pyexpat no longer copies the rest of the document at every tag.
#
#  * Slices.  The block copy must answer exactly what the element-by-element
#    walk did: the built-in's type for built-ins AND for their subclasses
#    (CPython's ``L([1, 2])[:1]'' is a list), THE empty tuple for an empty
#    tuple slice, a frozen tuple, an independent list, and the right
#    characters across a wide str.
#  * pyexpat.  _scan_markup tests a 9-character window instead of the whole
#    remainder, and Parse drops what it has consumed.  A document fed a few
#    characters at a time -- so markup openers, CDATA and comments straddle
#    chunk boundaries -- must report the same events and the same positions as
#    the same document parsed whole.
# Expected values are what CPython 3.14 answers.

import pyexpat

RESULTS = {}


class S(str):
    pass


class B(bytes):
    pass


class L(list):
    pass


class T(tuple):
    pass


def same(got, want):
    return got == want and type(got) is type(want)


# --- slices --------------------------------------------------------------------

RESULTS['str_slices'] = all([
    same('abcdef'[1:4], 'bcd'), same('abcdef'[4:1], ''), same('abcdef'[:], 'abcdef'),
    same('abcdef'[-2:], 'ef'), same('abcdef'[1:100], 'bcdef')])
RESULTS['wide_str_slices'] = all([
    same('ab€d'[1:3], 'b€'), same('ab€d'[3:], 'd'),
    same('x\U0001f600y'[1:2], '\U0001f600')])
RESULTS['bytes_slices'] = all([
    same(b'abcdef'[1:4], b'bcd'), same(b'abc'[3:], b''),
    same(bytearray(b'abc')[1:], bytearray(b'bc'))])
RESULTS['list_slices'] = all([
    same([1, 2, 3][1:], [2, 3]), same([1, 2, 3][5:], []), same([1, 2, 3, 4][1:3:1], [2, 3])])
RESULTS['tuple_slices'] = all([
    same((1, 2, 3)[1:], (2, 3)), same((1, 2, 3)[2:1], ())])
RESULTS['empty_tuple_slice_is_the_empty_tuple'] = (1, 2, 3)[2:1] is tuple()
RESULTS['subclass_slices_are_the_builtin'] = all([
    same(S('abc')[1:], 'bc'), same(B(b'abc')[1:], b'bc'),
    same(L([1, 2])[:1], [1]), same(T((1, 2))[:1], (1,))])
RESULTS['stepped_slices'] = all([
    same('abcdef'[::2], 'ace'), same('abcdef'[::-1], 'fedcba'),
    same((1, 2, 3, 4)[::-2], (4, 2))])


def list_copy_is_independent():
    original = [1, 2, 3]
    copy = original[:]
    copy.append(4)
    return original == [1, 2, 3] and copy == [1, 2, 3, 4] and copy is not original


RESULTS['list_copy_is_independent'] = list_copy_is_independent()


def tuple_slice_is_immutable():
    t = (1, 2, 3)[1:]
    try:
        t[0] = 9
    except TypeError:
        return True
    return False


RESULTS['tuple_slice_is_immutable'] = tuple_slice_is_immutable()


# --- pyexpat fed in pieces -----------------------------------------------------

DOC = ('<?xml version="1.0"?>\n<root a="1">\n  <!-- a comment -->\n'
       '  <item>one</item><item>two &amp; three</item>\n'
       '  <![CDATA[raw <b>text</b>]]>\n  <?pi data?>\n'
       '  <empty/>\n</root>\n')


def events(chunk):
    p = pyexpat.ParserCreate()
    out = []
    p.StartElementHandler = lambda name, attrs: out.append(
        ('start', name, attrs, p.CurrentLineNumber, p.CurrentColumnNumber))
    p.EndElementHandler = lambda name: out.append(
        ('end', name, p.CurrentLineNumber, p.CurrentColumnNumber))
    p.CharacterDataHandler = lambda text: out.append(('text', text))
    p.CommentHandler = lambda text: out.append(('comment', text))
    p.ProcessingInstructionHandler = lambda target, data: out.append(('pi', target, data))
    if chunk is None:
        p.Parse(DOC, True)
    else:
        for k in range(0, len(DOC), chunk):
            p.Parse(DOC[k:k + chunk], False)
        p.Parse('', True)
    return out


def joined_text(log):
    # expat may split character data differently by chunk; compare it whole.
    merged, text = [], []
    for event in log:
        if event[0] == 'text':
            text.append(event[1])
            continue
        if text:
            merged.append(('text', ''.join(text)))
            text = []
        merged.append(event)
    if text:
        merged.append(('text', ''.join(text)))
    return merged


WHOLE = joined_text(events(None))
RESULTS['chunked_parse_matches_whole_parse'] = all(
    joined_text(events(n)) == WHOLE for n in (1, 2, 3, 7, 10))
# Positions are left out here: inside a handler Grail reports the position
# AFTER the event where expat reports its start (#1386).  The chunked
# comparison above keeps them, since both sides of it come from one parser.
RESULTS['whole_parse_events'] = [e[:3] if e[0] == 'start' else e[:2]
                                 for e in WHOLE] == [
    ('start', 'root', {'a': '1'}), ('text', '\n  '), ('comment', ' a comment '),
    ('text', '\n  '), ('start', 'item', {}), ('text', 'one'), ('end', 'item'),
    ('start', 'item', {}), ('text', 'two & three'), ('end', 'item'),
    ('text', '\n  raw <b>text</b>\n  '), ('pi', 'pi'), ('text', '\n  '),
    ('start', 'empty', {}), ('end', 'empty'), ('text', '\n'), ('end', 'root')]

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
