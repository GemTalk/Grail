# Fixture for BuiltinsTestCase>>testNestedClassStringLiteralNewline.
#
# A string literal containing a newline, in a method of a class defined INSIDE a
# nested block (try/for/if), must keep its exact value.  ClassDefAst embeds each
# compiled method's source as a Smalltalk string literal; writing that literal
# char-by-char through the pretty-printer spliced indentCount tabs after every
# newline, so a newline EMBEDDED in the method's own string constants gained one
# stray tab per nesting level -- e.g. ``str(i) + '\n''' in a class defined in a
# try block produced ``i + '\n\t''' (test_iter test_writelines).
def check():
    ok = True

    try:
        class InTry:
            def nl(self):
                return "a\nb"

            def num(self, i):
                return str(i) + "\n"
    finally:
        pass
    ok = ok and (InTry().nl() == "a\nb")
    ok = ok and (InTry().num(7) == "7\n")

    for _ in range(1):
        class InFor:
            def multi(self):
                return "x\ny\nz"
    ok = ok and (InFor().multi() == "x\ny\nz")

    if True:
        class InIf:
            def triple(self):
                return """line1
line2"""
    ok = ok and (InIf().triple() == "line1\nline2")

    # Two nesting levels — previously two stray tabs.
    try:
        try:
            class Deep:
                def nl(self):
                    return "p\nq"
        finally:
            pass
    finally:
        pass
    ok = ok and (Deep().nl() == "p\nq")

    return ok
