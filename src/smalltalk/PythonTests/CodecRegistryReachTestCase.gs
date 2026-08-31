! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CodecRegistryReachTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CodecRegistryReachTestCase comment:
'``str.encode'' / ``bytes.decode'' consult the codec REGISTRY.

Grail resolved encodings in two unrelated places.  codecs.lookup walks
the registry, so it honours codecs.register() and everything the
``encodings'' package ships; str>>encode and Bytes>>decode each carried
their OWN table of built-in names and raised ``unknown encoding'' the
moment it missed.  The same codec, in the same process, was reachable
through codecs.encode(s, name) and unreachable through s.encode(name).

Both now ask importlib class >> ___registeredCodecInfoFor___: before
raising.  That bridge is consulted ONLY when codecs is already imported:
nothing can have been registered otherwise, and importing from inside
encode would be a recursion waiting to happen, since loading a module
reads a file and reading one decodes.

Worth recording about the bridge itself: sys.modules is a PySysModules,
which NORMALISES its keys, so the inherited ``at:otherwise:'' misses
where ``at:ifAbsent:'' -- the idiom Bool/Float/Int already use to reach
the warnings module -- finds.  The first cut used the former and answered
nil for a codec that was plainly imported.

test.test_codecs 167 -> 159.  The nine that went were UTF8SigTest, not
the user-registered codec the investigation started from: utf-8-sig is
shipped by the encodings package, so the same fallback reaches it.  One
of the nine (test_partial) advanced from ERROR to FAIL -- it now runs to
a real incremental-decoder difference instead of dying on lookup.

See tests/python/codec_registry_reach.py (13 checks, CPython-validated
first).'
%

expectvalue /Class
doit
CodecRegistryReachTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CodecRegistryReachTestCase removeAllMethods: 0.
CodecRegistryReachTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CodecRegistryReachTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'codec_registry_reach' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/codec_registry_reach.py')
		name: 'codec_registry_reach'.
%

category: 'Grail-Helpers'
method: CodecRegistryReachTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CodecRegistryReachTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: CodecRegistryReachTestCase
testARegisteredCodecIsReachableFromBothSides
	"The registry sees it, the codecs helpers use it, and -- the two that
	used to disagree -- str.encode and bytes.decode reach it too."

	self assertAll: #('lookup_finds_it' 'codecs_encode_helper'
		'codecs_decode_helper' 'str_encode_reaches_the_registry'
		'bytes_decode_reaches_the_registry')
%

category: 'Grail-Tests'
method: CodecRegistryReachTestCase
testAnEncodingsPackageCodecIsReachableToo
	"utf-8-sig is shipped rather than registered by hand, and the same
	fallback reaches it -- which is where the test_codecs movement
	actually came from."

	self assertAll: #('utf_8_sig_encode' 'utf_8_sig_round_trip'
		'utf_8_sig_underscore_spelling')
%

category: 'Grail-Tests'
method: CodecRegistryReachTestCase
testTheBuiltInTableAndTheMissAreUnchanged
	"The built-in names still answer from the fast table, and a name
	NOBODY provides still raises LookupError from both sides -- the
	fallback must not turn a miss into something else."

	self assertAll: #('utf_8_unchanged' 'ascii_unchanged'
		'latin_1_unchanged' 'an_unknown_encode_name_still_raises'
		'an_unknown_decode_name_still_raises')
%
