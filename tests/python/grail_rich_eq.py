# Fixture for ListTestCase>>testRichEqualityMembership.
#
# list __contains__ / count / index / remove must compare elements to the
# target by Python rich equality (identity first, then element.__eq__, then
# the reflected target.__eq__) IN ORDER, not Smalltalk `=` -- so custom
# __eq__ and identity are honored (seq_tests test_contains_fake /
# test_contains_order / test_count / test_index, list_tests test_remove).
class AlwaysEq:
    def __eq__(self, other):
        return True

    def __hash__(self):
        return 1


class NeverEq:
    def __eq__(self, other):
        return False

    def __hash__(self):
        return 2


always = AlwaysEq()
never = NeverEq()


def check():
    ok = []
    # __contains__: element-first rich comparison
    ok.append(always in [1])          # 1 == always -> reflected -> True
    ok.append(1 in [always])          # always == 1 -> True
    ok.append(always not in [never])  # never == always -> False
    ok.append(never in [always])      # always == never -> True
    # count
    ok.append([always, always].count(1) == 2)
    ok.append([never, never].count(always) == 0)
    ok.append(([0, 1, 2] * 3).count(always) == 9)
    # index (incl. start/stop and rich equality)
    ok.append([always, always].index(1) == 0)
    ok.append([-2, -1, 0, 0, 1, 2].index(0, 3) == 3)
    ok.append([-2, -1, 0, 0, 1, 2].index(0, 3, 4) == 3)
    # remove: first rich-equal element
    a = [1, 2]
    a.remove(always)
    ok.append(a == [2])
    return all(ok)
