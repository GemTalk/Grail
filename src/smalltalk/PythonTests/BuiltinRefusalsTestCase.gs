! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinRefusalsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
BuiltinRefusalsTestCase comment:
'Six builtins that ANSWERED where CPython refuses.

Grouped by that shape, not by subject.  A MISSING ERROR announces itself
the moment anything downstream looks at the result; a WRONG ANSWER
travels, and every one of these returned a plausible value for a call
CPython rejects.  That is why they belong in one test even though sum,
getattr, len, hash and max share no code.

SUM AND ITS START.  ``sum(items, start='''''''')'' concatenated the
strings and answered ''''ab''''.  CPython refuses a str, bytes or
bytearray start and names join() in the message, because repeated
concatenation is quadratic -- the refusal is a performance guarantee, not
a taste.  The check is on the START rather than on the items, which is
CPython''s rule too, and it fires before the walk, so ``sum([],
'''''''')'' is refused as well.

The keyword spelling was worse: it had NEVER WORKED.  ``_sum:kw:'' is
compiled in env 1, where a bare ``>='' on a SmallInteger is a Python
operator the class does not answer, and the comparison was on the first
line that executes -- so ``sum(x, start=0)'' raised an UNCATCHABLE
Smalltalk MessageNotUnderstood, never reaching the sum.  Its own comment
names jinja2''s sync_do_sum as the caller it was written for.  The
positional form went through a different, fixed-arity method and was
fine, which is why nothing noticed.

GETATTR AND ITS NAME.  ``getattr(o, 1)'' was already a TypeError; ``getattr(o,
1, ''''dflt'''')'' answered ''''dflt''''.  A default excuses a MISS, not a
wrong-typed name, and the check lived only on the 2-arg method.

The other half is a str Grail cannot make a Symbol of.  Attributes are
keyed by Symbol, a Symbol is made of Characters, and no Character holds a
code point in D800..DFFF -- so PyStrSurrogate deliberately refuses
asSymbol rather than answer something plausible, and getattr died on the
MessageNotUnderstood.  AttributeError is not a consolation prize there:
nothing can EVER be stored under that name, so the lookup genuinely
misses, which is what CPython answers too.  Raising it inside the lookup
rather than at the call site also means a default is still honoured.

LEN AND HASH AND THEIR RETURN VALUES.  len() already refused a __len__
that was not an integer and one that was negative; it handed back one
LARGER THAN sys.maxsize.  hash() checked nothing at all, so a __hash__
returning 1.0 travelled on as a hash, into dict and set bucket
arithmetic.  A BOOLEAN hash is accepted and normalised, because bool is
an int in Python and Grail''s true is not an Integer.

The len bound is READ from sys.maxsize rather than hardcoded to 2^63-1,
because Grail''s is 2^60-1, a GemStone SmallInteger -- CPython''s test
writes the case as ``sys.maxsize + 1'', so reading the same number the
caller reads is what makes it mean what it says.

MAX AND MIN AND THEIR KEYWORDS.  ``max(1, 2, default=None)'' answered 2.
A default is a fallback for an EMPTY sequence, and a call with two
positional arguments has no empty sequence to fall back from, so CPython
calls it a mistake.  An unknown keyword was ignored outright, so a
misspelt ``key='' silently sorted by nothing.

Covers test_builtin test_sum, test_getattr, test_len,
test_invalid_hash_typeerror, test_max and test_min.'
%

doit
BuiltinRefusalsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
BuiltinRefusalsTestCase removeAllMethods: 0.
BuiltinRefusalsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuiltinRefusalsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtin_refusals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_refusals.py')
		name: 'builtin_refusals'.
%

category: 'Grail-Helpers'
method: BuiltinRefusalsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: BuiltinRefusalsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testSumRefusesAStringOrBytesStart
	"Named in the message, because join() is what the caller wanted.  The
	refusal is on the START, so it fires before the walk and an empty
	iterable is refused too."

	self assertAll: #('sum_refuses_str' 'sum_refuses_bytes'
		'sum_refuses_bytearray' 'sum_refuses_an_empty_iterable_too')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testSumTakesItsStartAsAKeyword
	"The spelling that had never worked: a bare env-1 comparison on the
	first line raised an uncatchable MessageNotUnderstood."

	self assertAll: #('sum_start_keyword')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testSumStillSumsWhatItAlwaysSummed
	"The regression half.  Lists are NOT refused -- only str, bytes and
	bytearray are, which is CPython's line and not a general ban on
	concatenation."

	self assertAll: #('sum_still_sums_lists')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testGetattrChecksTheNameEvenWithADefault
	"The wrong-answer half of the pair: without a default this was already
	a TypeError, with one it answered the default."

	self assertAll: #('getattr_name_with_default'
		'getattr_name_without_default')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testGetattrMissesOnASurrogateName
	"A str no Symbol can be made of.  It cannot name a stored attribute,
	so the lookup misses -- and the miss is raised inside the lookup, so a
	default is still honoured."

	self assertAll: #('getattr_surrogate_name'
		'getattr_surrogate_name_with_default')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testGetattrStillAnswersAndStillFallsBack
	"The regression half."

	self assertAll: #('getattr_default_still_works')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testLenRefusesALengthThatDoesNotFitAnIndex
	"Against sys.maxsize, which is what the caller compares against.  A
	hugely NEGATIVE length stays the ValueError, and a length AT the limit
	still answers -- the halves a blunter cap would break."

	self assertAll: #('len_too_big' 'len_too_negative' 'len_at_the_limit')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testHashMustBeHandedAnInteger
	"A float hash was passed on to bucket arithmetic.  CPython's check is
	PyLong_Check, which admits SUBCLASSES, so both kinds of Python int
	that are not a Smalltalk Integer are accepted: a boolean (bool is an
	int in Python) and an int subclass (an AbstractPyInt in Grail).  A
	LONG hash stays allowed -- CPython bug 1536021 made it so."

	self assertAll: #('hash_not_an_integer' 'hash_boolean'
		'hash_int_subclass' 'hash_may_be_long')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testMaxAndMinRefuseADefaultTheyCannotUse
	"A default is a fallback for an empty sequence; several positional
	arguments are not one."

	self assertAll: #('default_with_several_positionals')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testMaxAndMinRefuseAKeywordTheyDoNotKnow
	"Ignored outright before, so a misspelt ``key='' sorted by nothing."

	self assertAll: #('unexpected_keyword')
%

category: 'Grail-Tests'
method: BuiltinRefusalsTestCase
testMaxAndMinStillAnswerEverySpellingTheyTook
	"The regression half: default on an empty iterable, both the iterable
	and the several-positional forms, and a key function."

	self assertAll: #('the_spellings_that_stay')
%

