! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonVisibleMroTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PythonVisibleMroTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PythonVisibleMroTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PythonVisibleMroTestCase
!
! Grail roots every Python-defined class at ``PythonInstance'' -- the Smalltalk
! class carrying the instance dictionary, the catchable-TypeError call fallbacks
! and the doesNotUnderstand: bridge, which is the job CPython gives to
! ``object''.  The kernel ``Object'' (Python's ``object'') sits directly above
! it, so reporting both put a base class in the Python-visible chain that CPython
! does not have, BETWEEN two that it does:
!
!     class Plain: pass    Grail   (Plain, PythonInstance, object)
!                          CPython (Plain, object)
!
! Hiding it is not cosmetic tidying: for a Python-defined class it makes
! __mro__ EQUAL CPython's, because object already followed.
!
! WHAT THE LEAK COST.  PythonInstance answers no ``__module__''.  pydoc's
! TextDoc.docclass asks every base in the mro for one to render the ``Method
! resolution order:'' block; the AttributeError was swallowed by document()'s own
! ``except AttributeError: pass''; and every class fell through to docdata.
! ``help(C)'' printed one line -- ``Color = <enum 'Color'>'' -- for every class in
! the system.  inspect.getclasstree rooted its trees at PythonInstance for the
! same reason, since it builds them purely from __bases__.  That is the shape of
! this bug generally: an internal class in a Python-visible chain is a silent
! wrong ANSWER rather than an error, because the consumer is introspecting and
! has a fallback.
!
! ONLY THIS ONE ROOT IS HIDDEN, deliberately.  The rest of what the Smalltalk
! chain contributes -- Number and Magnitude above int, CharacterCollection above
! str, AbstractException above Exception -- is a different gap: those sit above
! classes Python also has, so hiding them means deciding per builtin where the
! Python type ends, not dropping a single universal root.
!
! The second half of the fixture is the part that had to be PROVED rather than
! asserted: hiding a class from the reflection surface must not change what the
! chain does.  Method lookup, super(), isinstance and issubclass all walk the
! Smalltalk superclass chain directly, and PythonInstance is still there for
! them.
!
! Source fixture: tests/python/python_visible_mro.py
! ===============================================================================

doit
PythonVisibleMroTestCase comment:
'Tests that the Python-visible class chain (__mro__, mro(), __bases__,
__base__) names only classes CPython also names, and that hiding Grail''s
implementation root leaves method resolution, super() and issubclass
untouched.  Drives tests/python/python_visible_mro.py.'
%

doit
PythonVisibleMroTestCase removeAllMethods.
PythonVisibleMroTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PythonVisibleMroTestCase
setUp
	"Reload tests/python/python_visible_mro.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'python_visible_mro' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/python_visible_mro.py')
		name: 'python_visible_mro'.
%

category: 'Grail-Private'
method: PythonVisibleMroTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The chain as Python sees it'
method: PythonVisibleMroTestCase
testAPlainClassHasCPythonsMro
	"The simplest case, and the one that shows the elision is exact rather than
	approximate: (Plain, object) is not ``close to'' CPython's answer, it IS it."

	self assert: (self resultAt: 'plain_mro') asString
		equals: '[''Plain'', ''object'']'.
	self assert: (self resultAt: 'leaf_mro') asString
		equals: '[''Leaf'', ''Mid'', ''Plain'', ''object'']'.
%

category: 'Grail-Tests - The chain as Python sees it'
method: PythonVisibleMroTestCase
testAnEnumAndAMultipleInheritanceClassHaveCPythonsMro
	"The enum is the case pydoc could not document.  The MI class matters
	separately: its linearization comes from importlib's C3 walk rather than the
	raw superclass chain, so the two derivations had to be filtered in step or
	they would disagree."

	self assert: (self resultAt: 'enum_mro') asString
		equals: '[''Color'', ''Enum'', ''object'']'.
	self assert: (self resultAt: 'mi_mro') asString
		equals: '[''MI'', ''A'', ''B'', ''object'']'.
%

category: 'Grail-Tests - The chain as Python sees it'
method: PythonVisibleMroTestCase
testAFunctionLocalClassIsFilteredToo
	"Nothing about the elision depends on where the class was defined."

	self assert: (self resultAt: 'local_mro') asString
		equals: '[''Local'', ''object'']'.
%

category: 'Grail-Tests - The chain as Python sees it'
method: PythonVisibleMroTestCase
testTheThreeSpellingsOfTheMroAgree
	"__mro__, mro() and inspect.getmro are separate methods in Grail, so a fix
	applied to one of them and not the others is a real possibility."

	self assert: (self resultAt: 'mro_call_agrees') asString equals: 'True'.
	self assert: (self resultAt: 'getmro_agrees') asString equals: 'True'.
%

category: 'Grail-Tests - The chain as Python sees it'
method: PythonVisibleMroTestCase
testTheDirectBasesNameObjectRatherThanTheImplementationRoot
	"Its own fix, not a consequence of the mro one: inspect.getclasstree builds
	its tree purely from __bases__, so it rooted every tree at PythonInstance
	independently of how __mro__ read."

	self assert: (self resultAt: 'plain_bases') asString equals: '[''object'']'.
	self assert: (self resultAt: 'plain_base') asString equals: '''object'''.
	self assert: (self resultAt: 'enum_base_of_enum') asString equals: '''object'''.
	self assert: (self resultAt: 'leaf_bases') asString equals: '[''Mid'']'.
	self assert: (self resultAt: 'leaf_base') asString equals: '''Mid'''.
	self assert: (self resultAt: 'mi_bases') asString equals: '[''A'', ''B'']'.
%

category: 'Grail-Tests - The chain still works'
method: PythonVisibleMroTestCase
testHidingTheRootDoesNotUnlinkIt
	"The distinction this whole change rests on: the class is filtered out of
	what is REPORTED, not removed from the chain that is WALKED.  Every consumer
	below reads the real Smalltalk chain, and each would break if the elision
	had been done by re-rooting instead of by filtering."

	self assert: (self resultAt: 'issubclass_object') asString equals: 'True'.
	self assert: (self resultAt: 'isinstance_object') asString equals: 'True'.
	self assert: (self resultAt: 'issubclass_through_gap') asString equals: 'True'.
	self assert: (self resultAt: 'super_still_works') asString equals: '''sub+base'''.
	self assert: (self resultAt: 'inherited_method') asString equals: 'True'.
	self assert: (self resultAt: 'enum_member_lookup') asString equals: '1'.
%

set compile_env: 0
