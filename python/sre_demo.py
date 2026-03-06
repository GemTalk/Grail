
import _sre

# The _sre module is CPython's low-level regular expression engine,
# forked from CPython 3.14 and compiled against the Grail shim.

# getcodesize() returns the size of an SRE opcode (4 bytes).
codesize = _sre.getcodesize()
print('SRE code size: ' + str(codesize) + ' bytes')

# ascii_iscased() checks if an ASCII character has upper/lower variants.
def check_cased(label, codepoint):
    result = _sre.ascii_iscased(codepoint)
    ch = chr(codepoint)
    if result:
        print('  ' + ch + ' (' + label + ') is cased')
    else:
        print('  ' + ch + ' (' + label + ') is not cased')

print('ASCII cased check:')
check_cased('uppercase letter', 65)   # A
check_cased('lowercase letter', 122)  # z
check_cased('digit', 48)              # 0
check_cased('punctuation', 33)        # !

# ascii_tolower() converts an ASCII character to lowercase.
print('ASCII tolower:')
pairs = [[65, 'A'], [90, 'Z'], [97, 'a'], [50, '2']]
i = 0
while i < len(pairs):
    pair = pairs[i]
    codepoint = pair[0]
    label = pair[1]
    lower = _sre.ascii_tolower(codepoint)
    print('  ' + label + ' -> ' + chr(lower))
    i = i + 1

# unicode_iscased() and unicode_tolower() handle the full Unicode range.
print('Unicode tolower:')
print('  A -> ' + chr(_sre.unicode_tolower(65)))
print('  Z -> ' + chr(_sre.unicode_tolower(90)))
