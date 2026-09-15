! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SurrogateEncodeHandlersTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SurrogateEncodeHandlersTestCase comment:
'The substituting error handlers work on a string carrying a lone surrogate.

``''''\xe4''''.encode(''''ascii'''', ''''replace'''')'''' answered b''?'',
because CharacterCollection >> ___unencodable___:at:encoding:errors:reason:
decides what an un-encodable code point contributes.  A string holding a
LONE SURROGATE never reached that: it is a PyStrSurrogate, whose encode
handled surrogatepass, surrogateescape and utf-7 and then refused outright.

So whether ``replace'''' worked depended on WHICH character could not be
encoded -- a distinction CPython does not make.

TEXT IS SUBSTITUTED, THEN ENCODED ONCE, which is the part worth reading the
method for.  CPython''s encode handlers answer a replacement STRING that
the codec then encodes like any other text.  A first cut here assembled
BYTES instead -- encode each ordinary run, concatenate the handler''s bytes
between -- and that got two things wrong in one stroke on the multi-byte
codecs: the escape stayed raw ASCII among UTF-16 units, and a SECOND BOM
appeared wherever the next run began.  Both are asserted, which is why the
grid runs over utf-16 and utf-32 and not just utf-8.

Nine codecs by four handlers, and the mixed case besides: a string holding
BOTH a non-surrogate the codec cannot encode and a surrogate takes ONE
policy across both, which is why the string is encoded with the handler
rather than strictly.'
%

doit
SurrogateEncodeHandlersTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
SurrogateEncodeHandlersTestCase removeAllMethods: 0.
SurrogateEncodeHandlersTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: SurrogateEncodeHandlersTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'surrogate_encode_handlers' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/surrogate_encode_handlers.py')
		name: 'surrogate_encode_handlers'.
%

category: 'Grail-Helpers'
method: SurrogateEncodeHandlersTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: SurrogateEncodeHandlersTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: SurrogateEncodeHandlersTestCase
testTheWholeGridEncodes
	"Nine codecs by four handlers.  A failure names the pair."

	self assertAll: #('the_whole_grid_encodes')
%

category: 'Grail-Tests'
method: SurrogateEncodeHandlersTestCase
testTheCodecFramesTheWholeStringOnce
	"The two things a byte-assembling implementation gets wrong on a
	multi-byte codec: a BOM per fragment, and a replacement left in ASCII
	among the target codec's units."

	self assertAll: #('one_bom_not_one_per_fragment'
		'the_replacement_is_encoded_in_the_target_codec')
%

category: 'Grail-Tests'
method: SurrogateEncodeHandlersTestCase
testOnePolicyAcrossEveryUnencodableCharacter
	"A plain str is untouched by the change, and a string holding BOTH
	kinds of un-encodable character takes one policy across both."

	self assertAll: #('a_plain_str_is_unaffected'
		'mixed_unencodable_kinds_share_one_policy')
%

category: 'Grail-Tests'
method: SurrogateEncodeHandlersTestCase
testStrictAndTheSurrogateHandlersAreUnchanged
	"Widening which handlers fire must not weaken strict, nor disturb
	surrogatepass and surrogateescape, which already worked."

	self assertAll: #('strict_still_refuses'
		'surrogatepass_and_escape_still_work')
%
