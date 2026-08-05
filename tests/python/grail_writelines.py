# Fixture for BuiltinsTestCase>>testWritelinesIterableProtocol.
#
# file.writelines(x) iterates x via the Python protocol (test_iter's
# test_writelines): a non-iterable (None/int) raises a catchable TypeError, a
# dict yields its KEYS, and a large custom iterator (defined inside the try
# block) writes every element in order.  The custom-iterator-in-try case also
# guards the ClassDefAst string-literal codegen fix -- str(i) + "\n" in a
# try-nested class must not gain a stray tab.
def check(path):
    # The caller supplies the path (BuiltinsTestCase>>testWritelinesIterableProtocol
    # passes `self tmp:`): this module is loaded with loadModuleFromPath:, so it
    # cannot use the $TMP token that eval:'d fixtures do, and a hardcoded
    # /tmp path would collide with the other checkouts sharing this host.
    f = open(path, "w", encoding="utf-8")
    try:
        try:
            f.writelines(None)
            return False
        except TypeError:
            pass
        try:
            f.writelines(42)
            return False
        except TypeError:
            pass

        f.writelines(["1\n", "2\n"])
        f.writelines(("3\n", "4\n"))
        f.writelines({"5\n": None})   # a dict yields its KEYS
        f.writelines({})

        class Iterator:
            def __init__(self, start, finish):
                self.start = start
                self.finish = finish
                self.i = self.start

            def __next__(self):
                if self.i >= self.finish:
                    raise StopIteration
                result = str(self.i) + "\n"
                self.i += 1
                return result

            def __iter__(self):
                return self

        class Whatever:
            def __init__(self, start, finish):
                self.start = start
                self.finish = finish

            def __iter__(self):
                return Iterator(self.start, self.finish)

        f.writelines(Whatever(6, 6 + 2000))
    finally:
        f.close()

    g = open(path, encoding="utf-8")
    try:
        lines = list(g)
    finally:
        g.close()
    expected = [str(i) + "\n" for i in range(1, 2006)]
    return lines == expected
