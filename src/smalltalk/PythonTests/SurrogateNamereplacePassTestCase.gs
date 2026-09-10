! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SurrogateNamereplacePassTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SurrogateNamereplacePassTestCase comment:
'namereplace, codec-aware surrogatepass, and a UTF-16 decode that RAISES.

Three findings from one thread, each uncovered by fixing the one before it.

1. namereplace was unimplemented.  ___unencodable___''s comment said it
needed the Unicode character-name database -- and Grail has one:
unicode_names >> ___nameForCodePoint: is what unicodedata.name() already
answers from.  A code point WITHOUT a name falls back to the backslash
escape, which is CPython''s rule and is why a lone surrogate comes out
identically under namereplace and backslashreplace.

2. surrogatepass ignored the target codec.  It always answered the WTF-8
form, so ``''''\udc80''''.encode(''''utf-16-le'''', ''''surrogatepass'''')''''
gave three UTF-8 bytes instead of two little-endian ones -- right for utf-8
by coincidence and wrong for every other UTF.

3. A UTF-16 decode of a lone surrogate died with an UNCATCHABLE Smalltalk
error.  Character codePoint: refuses a surrogate, and the one-argument
decode has no error handler to consult, so the session''s error path ran
instead of the program''s -- under strict, replace and ignore alike.  utf-32
already raised properly; this brings utf-16 alongside it, with CPython''s
own encoding / start / end / reason.

THE ORDER MATTERS AND IS THE LESSON.  Finding 3 was uncovered BY finding 1:
with namereplace in place the UTF-16 tests got as far as surrogatepass and
began dying uncatchably, which is worse than the assertion failure they had
before.  Fixing a handler moved six tests from a Python error to a Smalltalk
one, and that is not a trade worth shipping -- so the decode raise is part
of the same change rather than a follow-up.

STILL DIVERGENT, deliberately: replace and ignore on a UTF-16 decode answer
this error where CPython substitutes, because the one-argument decode never
receives the handler.  Threading it through is its own change; being
CATCHABLE is the part that could not wait.'
%

doit
SurrogateNamereplacePassTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
SurrogateNamereplacePassTestCase removeAllMethods: 0.
SurrogateNamereplacePassTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: SurrogateNamereplacePassTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'surrogate_namereplace_pass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/surrogate_namereplace_pass.py')
		name: 'surrogate_namereplace_pass'.
%

category: 'Grail-Helpers'
method: SurrogateNamereplacePassTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: SurrogateNamereplacePassTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: SurrogateNamereplacePassTestCase
testNamereplaceNamesTheCharacter
	"The name from the database, and the backslash fallback for a code
	point that has none -- which is what makes namereplace and
	backslashreplace agree on a lone surrogate, across every UTF."

	self assertAll: #('namereplace_uses_the_character_name'
		'namereplace_falls_back_when_there_is_no_name'
		'namereplace_matches_backslashreplace_for_a_surrogate')
%

category: 'Grail-Tests'
method: SurrogateNamereplacePassTestCase
testSurrogatepassUsesTheTargetCodec
	"Eight codecs, each spelling a surrogate its own way, with the BOM
	written once.  A supplementary character is still a surrogate PAIR in
	utf-16: the handler changes what is allowed through, not how the codec
	works."

	self assertAll: #('surrogatepass_uses_the_target_codecs_own_form'
		'surrogatepass_still_pairs_supplementary_characters')
%

category: 'Grail-Tests'
method: SurrogateNamereplacePassTestCase
testSurrogatepassRefusesWhatCannotCarryASurrogate
	"ascii and latin-1 have no surrogate form and must still raise; utf-7
	does -- RFC 2152 encodes UTF-16 code units -- and must keep claiming
	it."

	self assertAll: #('surrogatepass_refuses_a_codec_with_no_surrogate_form'
		'utf7_still_carries_a_surrogate')
%

category: 'Grail-Tests'
method: SurrogateNamereplacePassTestCase
testAUtf16DecodeErrorIsAPythonError
	"The severe half.  ``except UnicodeDecodeError'' must HANDLE a lone
	surrogate; an uncatchable Smalltalk error would abort the module
	instead.  Asserted with CPython's own encoding, start, end and reason,
	including the byte order plain ``utf-16'' resolves to."

	self assertAll: #('a_lone_surrogate_decode_raises_catchably'
		'a_trailing_high_surrogate_also_raises')
%

category: 'Grail-Tests'
method: SurrogateNamereplacePassTestCase
testValidInputAndOtherHandlersAreUnchanged
	"Adding a refusal must not break what decodes, including a real
	surrogate PAIR, and none of the earlier handlers may move."

	self assertAll: #('valid_utf16_still_decodes' 'strict_still_refuses'
		'the_other_handlers_are_unchanged' 'surrogateescape_round_trips')
%
