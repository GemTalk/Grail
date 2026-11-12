"""Fixture: a class body's ``vars().setdefault(name, value)'' answers the value.

In a class body ``vars()'' and ``locals()'' are the class namespace, and
``setdefault'' answers the value the namespace holds for the name once it has
run: the default when it stored it, the existing value when the name was
already bound.  Grail bound the class attribute but answered None, which is
what the store it routes through answers, so ``count = vars().setdefault('n',
0) + 1'' raised a TypeError and a name bound to the result read None.  Every
check holds under CPython 3.14, which is what makes it evidence.

Two calls that should see each other share one ``vars()'' mapping.  Grail's
class-body ``vars()'' is a snapshot of the names the body's statements bind
(docs/Class_Body_Namespace.md, stage 4), so a second ``vars()'' does not hold a
name the first one stored.  That is a separate gap.
"""

r = {}


class Fresh:
    stored = vars().setdefault('a', 1)


r['a_new_name_answers_the_default'] = [Fresh.stored, Fresh.a]


class Present:
    a = 1
    kept = vars().setdefault('a', 2)


r['a_bound_name_answers_its_value'] = [Present.kept, Present.a]


class Twice:
    namespace = vars()
    first = namespace.setdefault('a', 1)
    second = namespace.setdefault('a', 2)


r['the_second_call_answers_the_first_value'] = [Twice.first, Twice.second, Twice.a]


class NoDefault:
    answered = vars().setdefault('b')


r['no_default_answers_and_binds_none'] = [NoDefault.answered, 'b' in NoDefault.__dict__, NoDefault.b]


class Same:
    held = locals().setdefault('items', [3])


r['locals_answers_the_stored_object'] = [Same.held, Same.held is Same.items]


def counted():
    try:
        class Counted:
            count = vars().setdefault('n', 0) + 1
    except TypeError as error:
        return 'TypeError: %s' % error
    return [Counted.count, Counted.n]


r['the_answer_takes_part_in_an_expression'] = counted()

EXPECTED = {
    'a_new_name_answers_the_default': [1, 1],
    'a_bound_name_answers_its_value': [1, 1],
    'the_second_call_answers_the_first_value': [1, 1, 1],
    'no_default_answers_and_binds_none': [None, True, None],
    'locals_answers_the_stored_object': [[3], True],
    'the_answer_takes_part_in_an_expression': [1, 0],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
