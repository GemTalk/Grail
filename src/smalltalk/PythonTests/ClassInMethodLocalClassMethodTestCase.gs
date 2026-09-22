! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassInMethodLocalClassMethodTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassInMethodLocalClassMethodTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassInMethodLocalClassMethodTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassInMethodLocalClassMethodTestCase
!
! A CLASS STATEMENT INSIDE A METHOD OF A METHOD-LOCAL CLASS -- THE TRANSPORT,
! NOT THE ELIGIBILITY.
!
! #983 made this shape eligible by removing a refusal, on the grounds that the
! inner class takes the same compiled-text transport it takes anywhere else.
! It did not, quite.  That transport compiles its helper onto ``aBuilder
! targetClass'', and a method of a method-local class is built SHARED (cut 79)
! against importlib's stand-in rather than against any class it will run on --
! so the helper was filed where the method would never look.  The selector is
! derived from the class's source offset, so every regenerated copy sends the
! same missing selector:
!
!   a MyTzInfo class does not understand #'___irClassDef_91742_MyStr___'
!
! That is test.datetimetester's test_strftime_with_bad_tzname_replace, which
! read OK flag-off and ERROR flag-on for six days before the corpus was next
! measured.  The fix defers the helper for a shared build and files it once per
! class in ___irRegenerateOn___:.
!
! THE BASE OF THE MIDDLE CLASS IS THE DISCRIMINATOR, and it is why the first
! version of this fixture was VACUOUS.  With ``object'' or a plain module-level
! class as the middle base, the misfiled helper is still reachable and the
! fixture passed against the unfixed tree.  Only a BUILTIN base (str, dict,
! Exception, tzinfo) puts the class where the stand-in is not.  Every base gets
! a case here for that reason, and the two that cannot fail are kept as the
! controls that say so.
! ===============================================================================

doit
ClassInMethodLocalClassMethodTestCase removeAllMethods.
ClassInMethodLocalClassMethodTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassInMethodLocalClassMethodTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'cimlcm_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cimlcm_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: ClassInMethodLocalClassMethodTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_in_method_local_class_method.py'
%

category: 'Grail-Private'
method: ClassInMethodLocalClassMethodTestCase
___keys___
	"Named rather than read from the dict, so a key that stops being produced
	fails here instead of silently dropping out of the comparison."

	^ #('mid_object' 'mid_plain' 'mid_str' 'mid_dict' 'mid_exception'
	    'mid_tzinfo'
	    'mid_object_is_str' 'mid_plain_is_str' 'mid_str_is_str'
	    'mid_dict_is_str' 'mid_exception_is_str' 'mid_tzinfo_is_str'
	    'mid_object_replace' 'mid_plain_replace' 'mid_str_replace'
	    'mid_dict_replace' 'mid_exception_replace' 'mid_tzinfo_replace'
	    'sub_mid_object' 'sub_mid_plain' 'sub_mid_str' 'sub_mid_dict'
	    'sub_mid_exception' 'sub_mid_tzinfo'
	    'fresh_leaf_per_call' 'leaf_named_Leaf' 'leaf_is_str_subclass')
%

category: 'Grail-Private'
method: ClassInMethodLocalClassMethodTestCase
___irModule___
	"The fixture with the seam FORCED ON.

	Forced rather than inherited: the defect is invisible flag-off, so a test
	gated on the ambient flag would be a no-op on the flag-off gate and would
	pass with the fix reverted."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'cimlcm_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cimlcm_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'cimlcm_ir'.
	^ irModule
%

category: 'Grail-Private'
method: ClassInMethodLocalClassMethodTestCase
___disagreeingKeys___
	| mod results expected bad |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := (results @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad
%

category: 'Grail-Tests - class in a method-local class method'
method: ClassInMethodLocalClassMethodTestCase
testEveryMiddleBaseAgreesWithCPythonUnderIR
	"THE DISCRIMINATING TEST, and it is behavioural rather than a census row:
	nothing about eligibility changed here, only where the helper is filed.

	MEASURED BOTH WAYS.  Against the unfixed tree the fixture does not merely
	disagree -- loading it raises
	``a Mid class does not understand #'___irClassDef_1764_Leaf___''' before
	any key is produced, on the first BUILTIN-based middle class it reaches."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'class-in-method-local-class shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - class in a method-local class method'
method: ClassInMethodLocalClassMethodTestCase
testAFreshLeafClassPerCall
	"The middle class is rebuilt on every call, so its inner class must be too.

	Separated from the sweep above because a helper filed ONCE for all classes
	is exactly the bug this cut is about, and the shape it produces is two
	equal-looking classes rather than an error.  Identity, not contents."

	| mod results |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	self assert: (results @env1:__getitem__: 'fresh_leaf_per_call') == true
		description: 'two calls shared one leaf class'
%

category: 'Grail-Tests - class in a method-local class method'
method: ClassInMethodLocalClassMethodTestCase
testTheIRArmDidNotFallBack
	"Correct answers prove nothing if the seam fell back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'
%
