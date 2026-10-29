"""Fixture: a bare ``except:`` has to be the last handler of its try.

CPython's code generator refuses a bare ``except:`` followed by another
handler -- ``default 'except:' must be last``, over that handler, from its
``except`` to the end of its body -- checking the try's body and else first
and each handler in turn (Python/codegen.c:2436-2463).  Grail compiled it,
so the handlers after it could never run (test_exceptions
testSyntaxErrorOffset).  Every check here holds under CPython 3.14, which is
what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


CASES = {
    'not_last': [
        ('try:\n  pass\nexcept:\n  pass\nexcept ValueError:\n  pass',
         ("default 'except:' must be last", 3, 1, 4, 7)),
        ('try:\n  pass\nexcept:\n  x = 1\n  y = 2\nexcept ValueError:\n  pass\nelse:\n  pass',
         ("default 'except:' must be last", 3, 1, 5, 8)),
        ('try:\n  pass\nexcept:\n  pass\nexcept:\n  pass',
         ("default 'except:' must be last", 3, 1, 4, 7)),
        ('try:\n  pass\nexcept ValueError:\n  pass\nexcept:\n  pass\nexcept TypeError:\n  pass',
         ("default 'except:' must be last", 5, 1, 6, 7)),
        ('def f():\n  try:\n    pass\n  except: pass\n  except E: pass',
         ("default 'except:' must be last", 4, 3, 4, 15)),
        ('try:\n  pass\nexcept:\n  pass\nexcept E:\n  pass\nfinally:\n  pass',
         ("default 'except:' must be last", 3, 1, 4, 7)),
        ('for x in y:\n  try:\n    pass\n  except:\n    pass\n  except E:\n    pass',
         ("default 'except:' must be last", 4, 3, 5, 9)),
    ],
    'an_earlier_error_wins': [
        ('try:\n  break\nexcept:\n  pass\nexcept E:\n  pass',
         ("'break' outside loop", 2, 3, 2, 8)),
        ('try:\n  pass\nexcept:\n  pass\nexcept E:\n  pass\n1 +',
         ('invalid syntax', 7, 4, 7, 5)),
        ('try:\n  pass\nexcept E:\n  break\nexcept:\n  pass\nexcept F:\n  pass',
         ("'break' outside loop", 4, 3, 4, 8)),
    ],
}
LEGAL = [
    'try:\n  pass\nexcept ValueError:\n  pass\nexcept:\n  pass',
    'try:\n  pass\nexcept:\n  pass',
    'try:\n  pass\nexcept:\n  pass\nelse:\n  pass\nfinally:\n  pass',
    'try:\n  pass\nexcept* ValueError:\n  pass\nexcept* TypeError:\n  pass',
    'try:\n  pass\nfinally:\n  pass',
]

EXPECTED = {}
for key, cases in CASES.items():
    r[key] = [outcome(source) for source, _ in cases]
    EXPECTED[key] = [expected for _, expected in cases]
r['legal'] = [outcome(each) for each in LEGAL]
EXPECTED['legal'] = ['ok'] * len(LEGAL)

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-34s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            for (source, want), got in zip(CASES.get(key, [(s, 'ok') for s in LEGAL]), r[key]):
                if got != want:
                    print('    %r: got %r, want %r' % (source, got, want))
    print(SUMMARY)
