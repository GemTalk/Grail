# Regression fixture: Grail's pure-Python pyexpat against expat's own
# behaviour in two places it used to diverge.
#
#  * Reparse deferral (expat 2.6).  Once a parse consumes nothing, expat does
#    not reparse until the unconsumed bytes have doubled, so ``<doc'' then
#    ``>'' starts no element until flush() or more input.
#  * The default handler.  expat hands it every token no handler claimed: tags,
#    CDATA delimiters, raw references, and the DTD a token at a time, decided
#    by each token's role -- a redeclared entity's name and value reach it
#    even with EntityDeclHandler set.  DefaultHandler and DefaultHandlerExpand
#    are one slot (the later assignment wins), and DefaultHandler hands an
#    internal entity reference over instead of expanding it.
# Expected values are what CPython 3.14's expat 2.7 answers.

import pyexpat

RESULTS = {}


def log_of(doc, **handlers):
    p = pyexpat.ParserCreate()
    out = []
    for name, on in handlers.items():
        setattr(p, name, (lambda n: lambda *a: out.append((n[:3],) + a))(name)
                if on else None)
    p.Parse(doc, True)
    return out


def D(*texts):
    return [('Def', t) for t in texts]


# --- reparse deferral --------------------------------------------------------

def deferral(enabled):
    p = pyexpat.ParserCreate()
    seen = []
    p.StartElementHandler = lambda name, attrs: seen.append(name)
    p.SetReparseDeferralEnabled(enabled)
    for chunk in ('<doc', '>'):
        p.Parse(chunk, False)
    before = list(seen)
    p.SetReparseDeferralEnabled(False)
    p.Parse(b'', False)
    return before, list(seen)


RESULTS['deferral_on_by_default'] = pyexpat.ParserCreate().GetReparseDeferralEnabled() is True
RESULTS['deferral_holds_back_a_small_reparse'] = deferral(True) == ([], ['doc'])
RESULTS['no_deferral_parses_at_once'] = deferral(False) == (['doc'], ['doc'])
RESULTS['version_reports_deferral'] = pyexpat.version_info >= (2, 6, 0)

# --- the default handler -----------------------------------------------------

RESULTS['subset_token_by_token'] = log_of(
    '<!DOCTYPE r [\n <!ELEMENT r (#PCDATA|a)*>\n <!ATTLIST r k CDATA "d">\n'
    ' <!ENTITY e "v">\n]>\n<r>&e;<a/></r>', DefaultHandler=1) == D(
    '<!DOCTYPE', ' ', 'r', ' ', '[', '\n ', '<!ELEMENT', ' ', 'r', ' ', '(',
    '#PCDATA', '|', 'a', ')*', '>', '\n ', '<!ATTLIST', ' ', 'r', ' ', 'k',
    ' ', 'CDATA', ' ', '"d"', '>', '\n ', '<!ENTITY', ' ', 'e', ' ', '"v"',
    '>', '\n', ']', '>', '\n', '<r>', '&e;', '<a/>', '</r>')
RESULTS['redeclared_entity_reaches_default'] = log_of(
    '<!DOCTYPE r [<!ENTITY e "v"><!ENTITY e "w"><!ENTITY amp "&#38;#38;">]><r/>',
    EntityDeclHandler=1, DefaultHandlerExpand=1) == (
    D('<!DOCTYPE', ' ', 'r', ' ', '[')
    + [('Ent', 'e', 0, 'v', None, None, None, None)]
    + D('e', '"w"', 'amp', '"&#38;#38;"', ']', '>', '<r/>'))
RESULTS['content_markup_and_raw_refs'] = log_of(
    '<r>&amp;&#65;<![CDATA[x\ny]]></r>', DefaultHandlerExpand=1) == D(
    '<r>', '&amp;', '&#65;', '<![CDATA[', 'x', '\n', 'y', ']]>', '</r>')
RESULTS['later_assignment_wins'] = log_of(
    '<r>t</r>', DefaultHandler=1, DefaultHandlerExpand=0) == []


def element_models():
    p = pyexpat.ParserCreate()
    out = []
    p.ElementDeclHandler = lambda name, model: out.append(model)
    p.Parse('<!DOCTYPE r [<!ELEMENT r (#PCDATA|a)*><!ELEMENT a (b,(c|d)?,e*)>'
            '<!ELEMENT b EMPTY>]><r/>', True)
    return out


RESULTS['element_decl_models'] = element_models() == [
    (3, 2, None, ((4, 0, 'a', ()),)),
    (6, 0, None, ((4, 0, 'b', ()), (5, 1, None, ((4, 0, 'c', ()), (4, 0, 'd', ()))),
                  (4, 2, 'e', ()))),
    (1, 0, None, ())]

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
