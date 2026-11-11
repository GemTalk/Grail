"""Fixture: a class attribute is read along the MRO past a base that two bases share.

CPython reads a class attribute from the first class on the MRO that has
it in its __dict__ (_PyType_Lookup, Objects/typeobject.c).  For

    class A: x = 'A'
    class B(A): pass
    class C(A): x = 'C'
    class D(B, C): pass

the MRO is D, B, C, A, object, so D.x and D().x are 'C'.

Grail answered 'A' (#1769).  It inherits only the first base through
Smalltalk and copies the other bases' class-body values onto the new class,
but it skipped a value whenever the new class could already read the name
from anywhere, and here it could: from A, through B.  Methods were already
right (#1479), and so was a shared base that got its value from setattr.

itsdangerous is that shape, which is how Flask sessions met it:
URLSafeTimedSerializer(URLSafeSerializerMixin, TimedSerializer[str]) read
Serializer's default_signer instead of TimedSerializer's TimestampSigner.

The checks after the diamond ones guard what must not move: the primary
base's own binding, the subclass's own value, __dict__, a per-class dunder,
and the plain two-base case.  Every check holds under CPython 3.14, which is
what makes it evidence.
"""

from typing import Generic, TypeVar

r = {}


class A:
    x = 'A'


class B(A):
    pass


class C(A):
    x = 'C'


class D(B, C):
    pass


r['the_secondary_base_beats_the_shared_one'] = [D.x, [k.__name__ for k in D.__mro__]]
r['an_instance_reads_the_same'] = D().x


class AnnotatedC(A):
    x: str = 'annotated C'


class AnnotatedD(B, AnnotatedC):
    pass


r['an_annotated_assignment_too'] = AnnotatedD.x


class FromTheSecondarysAncestor(C):
    pass


class DeepB(B):
    pass


class DeeperB(DeepB):
    pass


# The primary base is the deeper chain, so it stays the one Grail inherits
# through Smalltalk and C's value has to come from the copy.
class DeeperD(DeeperB, FromTheSecondarysAncestor):
    pass


r['the_secondarys_own_ancestor_too'] = DeeperD.x


class ThreeBases(B, A.__class__('Empty', (A,), {}), C):
    pass


r['a_later_base_reaches_past_two_shared_ones'] = ThreeBases.x


T = TypeVar('T')


class Signer:
    pass


class TimestampSigner(Signer):
    pass


class Serializer(Generic[T]):
    default_signer = Signer


class TimedSerializer(Serializer[T]):
    default_signer = TimestampSigner


class URLSafeSerializerMixin(Serializer[str]):
    pass


class URLSafeTimedSerializer(URLSafeSerializerMixin, TimedSerializer[str]):
    pass


r['itsdangerous_reads_the_timestamp_signer'] = [
    URLSafeTimedSerializer.default_signer.__name__,
    URLSafeTimedSerializer().default_signer.__name__]


class OwnB(A):
    x = 'B'


class PrimaryWins(OwnB, C):
    pass


r['the_primary_bases_own_binding_still_wins'] = PrimaryWins.x


class OwnValue(B, C):
    x = 'D'


r['the_subclasss_own_value_still_wins'] = [OwnValue.x, OwnValue().x]

r['the_read_value_is_not_in_the_subclass_dict'] = [
    'x' in D.__dict__, 'x' in C.__dict__, 'x' in A.__dict__]


class Documented:
    """Documented's docstring."""


class DocumentedB(Documented):
    pass


class DocumentedC(Documented):
    """DocumentedC's docstring."""


class Undocumented(DocumentedB, DocumentedC):
    pass


r['a_dunder_stays_per_class'] = Undocumented.__doc__


class P:
    x = 'P'


class Q:
    pass


class R(Q, P):
    pass


r['two_unrelated_bases_are_unchanged'] = R.x


class MethodA:
    def m(self):
        return 'A'


class MethodB(MethodA):
    pass


class MethodC(MethodA):
    def m(self):
        return 'C'


class MethodD(MethodB, MethodC):
    pass


r['methods_were_already_right'] = MethodD().m()


EXPECTED = {
    'the_secondary_base_beats_the_shared_one': ['C', ['D', 'B', 'C', 'A', 'object']],
    'an_instance_reads_the_same': 'C',
    'an_annotated_assignment_too': 'annotated C',
    'the_secondarys_own_ancestor_too': 'C',
    'a_later_base_reaches_past_two_shared_ones': 'C',
    'itsdangerous_reads_the_timestamp_signer': ['TimestampSigner', 'TimestampSigner'],
    'the_primary_bases_own_binding_still_wins': 'B',
    'the_subclasss_own_value_still_wins': ['D', 'D'],
    'the_read_value_is_not_in_the_subclass_dict': [False, True, True],
    'a_dunder_stays_per_class': None,
    'two_unrelated_bases_are_unchanged': 'P',
    'methods_were_already_right': 'C',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-45s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
