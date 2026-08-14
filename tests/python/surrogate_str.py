# A Python str holding code points GemStone has no Character for.
#
# CPython's str is a sequence of CODE POINTS, 0..0x10FFFF, INCLUDING the
# surrogate block D800..DFFF.  GemStone's Character is a Unicode SCALAR VALUE
# -- code points minus that block -- so ``Character codePoint: 16rD800'' raises
# OutOfRange and no CharacterCollection can hold one.
#
# This is NOT an encoding difference.  Both systems store a fixed-width array
# of code points and encode to UTF-8 only on the way out, and CPython refuses a
# lone surrogate on the wire too (see encode_strict below, which is a
# UnicodeEncodeError in CPython exactly as it is here).  The difference is the
# value set the character type admits, and CPython needs the wider one because
# of PEP 383 surrogateescape: OS bytes that are not valid UTF-8 -- filenames,
# argv, environ -- map to U+DC80..U+DCFF so they round-trip.
#
# The literal is usually incidental, but the tokenizer refusing it failed the
# whole MODULE, since Grail compiles every method body at import.  Five wired
# CPython modules scored IMPORTERROR on one literal each.
#
# Every expected value here was taken from CPython 3.14.

r = {}

s = "\ud800"
t = "a\udc80b"

# --- it is a str, and it is the right length ---------------------------------
# Length is in CODE POINTS: 'a\udc80b' is three characters, not the four or six
# bytes any encoding of it would take.

r['type_s'] = type(s).__name__
r['isinstance_str'] = isinstance(s, str)
r['len_s'] = len(s)
r['len_t'] = len(t)

# --- repr escapes the surrogate, as CPython's does ---------------------------

r['repr_s'] = repr(s)
r['repr_t'] = repr(t)
r['str_is_self'] = str(s) is s

# --- comparison and hashing --------------------------------------------------
# A surrogate-bearing string can never equal one without a surrogate, because
# no CharacterCollection can hold a surrogate -- so the two representations
# have no pair of values that ought to compare equal.  That is what makes the
# split safe rather than merely convenient.

r['eq_self'] = s == s
r['eq_other'] = s == "a"
r['eq_same'] = t == "a\udc80b"
r['ne'] = s != "a"
r['bool'] = bool(s)
r['contains'] = "\udc80" in t

# --- indexing, iterating and concatenating -----------------------------------
# The invariant that makes this safe: anything built out of the string that
# does NOT itself contain a surrogate comes back as an ORDINARY str.  Without
# that demotion, t[0] would be a surrogate-carrying object holding just "a" and
# would compare unequal to "a" -- a silently wrong answer, which is the hazard
# a second representation invites.

r['index_0'] = repr(t[0])
r['index_1'] = repr(t[1])
r['idx0_eq'] = t[0] == "a"
r['idx2_eq'] = t[2] == "b"
r['idx1_eq_self'] = t[1] == t[1]
r['idx1_ne_plain'] = t[1] == "a"
r['idx0_type'] = type(t[0]).__name__
r['iter_eq'] = [c == e for c, e in zip(t, ["a", t[1], "b"])]
r['concat_r'] = repr(s + "x")
r['concat_l'] = repr("x" + s)
r['concat_keeps'] = (s + "x")[1] == "x"

# A demoted character must hash and key like the ordinary string it now is.
r['hash_idx0'] = hash(t[0]) == hash("a")
r['in_dict'] = {t[0]: 1}.get("a")

# --- encoding ----------------------------------------------------------------
# The one place CPython and GemStone already agreed: strict UTF-8 refuses a
# lone surrogate.  ``surrogatepass`` is the documented way through, and gives
# the WTF-8 form (U+D800 -> ED A0 80).

try:
    s.encode('utf-8')
    r['encode_strict'] = 'no error'
except Exception as e:
    r['encode_strict'] = type(e).__name__
r['encode_pass'] = list(s.encode('utf-8', 'surrogatepass'))

# --- adjacent-literal concatenation ------------------------------------------
# How these appear in practice: CPython's own tests split them across source
# lines, so the parser has to join a surrogate part with an ordinary one.

joined = "before" "\ud800" "after"
r['joined_len'] = len(joined)
r['joined_repr'] = repr(joined)

# --- and the ordinary path must be completely untouched ----------------------

r['plain'] = "abc".upper()
r['plain_type'] = type("abc").__name__
r['plain_eq'] = "abc" == "abc"

RESULTS_REPR = {k: repr(v) for k, v in r.items()}
