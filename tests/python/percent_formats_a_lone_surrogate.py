"""Fixture: %-formatting takes a str holding a lone surrogate as an operand.

CPython's str is a sequence of code points, the surrogate block included,
and ``'<%s>' % s`` is ``'<' + s + '>'`` whatever s holds: %s is str(s)
(unicode_format_arg_format), its precision and width count code points
(unicode_format_arg_output), %c takes the code point of a one-character
str or an int, a surrogate included (formatchar), and a str on the right is
never a mapping (PyUnicode_Format), all in Objects/unicodeobject.c.

Grail refused a %s or %c field holding a surrogate: "str containing lone
surrogates does not support coerced to a Smalltalk string" for %s, an
UNCATCHABLE OutOfRange for ``'%c' % 0xd800``, and a TypeError for ``'%c'``
of a one-character surrogate str.  It took a surrogate str on the right for
a mapping, so ``'abc' % s`` answered 'abc'.  plistlib writes every string as
``'<%s>%s</%s>' % (element, value, element)``, which is how test_plistlib's
test_lone_surrogates met it.

Each result is compared as its type name and its code points, so no
surrogate is written in this file.  Every check holds under CPython 3.14,
which is what makes it evidence.
"""

HIGH = chr(0xD8FF)
LOW = chr(0xDC80)

r = {}


def outcome(make):
    try:
        value = make()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)
    return [type(value).__name__, [ord(each) for each in value]]


def code_points(text):
    return [ord(each) for each in text]


class HoldsASurrogate:
    def __str__(self):
        return HIGH


class Sub(str):
    pass


r['a_surrogate_field'] = outcome(lambda: '<%s>' % HIGH)
r['fields_on_both_sides'] = outcome(lambda: '%s-%s' % (HIGH, LOW))
r['a_mapping_field'] = outcome(lambda: '<%(x)s>' % {'x': HIGH})
r['an_object_whose_str_holds_one'] = outcome(lambda: '<%s>' % HoldsASurrogate())
r['later_fields_still_format'] = outcome(lambda: '%s%d|%5.2f' % (HIGH, 5, 1.5))
r['str_mod_called_directly'] = outcome(lambda: str.__mod__('<%s>', HIGH))

r['width_pads_on_the_left'] = outcome(lambda: '<%4s>' % HIGH)
r['minus_pads_on_the_right'] = outcome(lambda: '<%-4s>' % HIGH)
r['a_star_width'] = outcome(lambda: '<%*s>' % (3, HIGH))
r['precision_keeps_the_surrogate'] = outcome(lambda: '<%.1s>' % (HIGH + 'b'))
r['precision_cuts_the_surrogate_away'] = outcome(lambda: '<%.1s>' % ('a' + HIGH))

r['c_of_a_surrogate_code_point'] = outcome(lambda: '%c' % 0xD800)
r['c_of_a_one_character_surrogate_str'] = outcome(lambda: '%c' % HIGH)
r['c_with_a_width'] = outcome(lambda: '%3c' % 0xDC80)
r['c_of_a_longer_str_is_refused'] = outcome(lambda: '%c' % ('a' + HIGH))
r['c_of_a_one_character_str_subclass'] = outcome(lambda: '%c' % Sub('x'))

r['a_surrogate_operand_is_not_a_mapping'] = [
    outcome(lambda: 'abc' % HIGH),
    outcome(lambda: '%(a)s' % HIGH),
    outcome(lambda: '%s %s' % HIGH)]

formatted = '<%s>' % HIGH
r['the_result_is_the_concatenation'] = [
    formatted == '<' + HIGH + '>', len(formatted), isinstance(formatted, str),
    formatted.find(HIGH)]

EXPECTED = {
    'a_surrogate_field': ['str', [ord('<'), 0xD8FF, ord('>')]],
    'fields_on_both_sides': ['str', [0xD8FF, ord('-'), 0xDC80]],
    'a_mapping_field': ['str', [ord('<'), 0xD8FF, ord('>')]],
    'an_object_whose_str_holds_one': ['str', [ord('<'), 0xD8FF, ord('>')]],
    'later_fields_still_format': ['str', [0xD8FF] + code_points('5| 1.50')],
    'str_mod_called_directly': ['str', [ord('<'), 0xD8FF, ord('>')]],
    'width_pads_on_the_left': ['str', [ord('<')] + code_points('   ') + [0xD8FF, ord('>')]],
    'minus_pads_on_the_right': ['str', [ord('<'), 0xD8FF] + code_points('   >')],
    'a_star_width': ['str', [ord('<')] + code_points('  ') + [0xD8FF, ord('>')]],
    'precision_keeps_the_surrogate': ['str', [ord('<'), 0xD8FF, ord('>')]],
    'precision_cuts_the_surrogate_away': ['str', code_points('<a>')],
    'c_of_a_surrogate_code_point': ['str', [0xD800]],
    'c_of_a_one_character_surrogate_str': ['str', [0xD8FF]],
    'c_with_a_width': ['str', code_points('  ') + [0xDC80]],
    'c_of_a_longer_str_is_refused':
        'TypeError: %c requires an int or a unicode character, not a string of length 2',
    'c_of_a_one_character_str_subclass': ['str', code_points('x')],
    'a_surrogate_operand_is_not_a_mapping': [
        'TypeError: not all arguments converted during string formatting',
        'TypeError: format requires a mapping',
        'TypeError: not enough arguments for format string'],
    'the_result_is_the_concatenation': [True, 3, True, 1],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
