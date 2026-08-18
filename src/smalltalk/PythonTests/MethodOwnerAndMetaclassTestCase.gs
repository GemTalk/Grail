! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MethodOwnerAndMetaclassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MethodOwnerAndMetaclassTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MethodOwnerAndMetaclassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MethodOwnerAndMetaclassTestCase
!
! Two halves of one question -- who owns ``Color.__contains__''? -- that Grail
! answered differently from CPython in two different places.  Both surfaced
! through pydoc, which asks the question twice and compares the answers.
!
! WHICH CLASS.  An UnboundMethod records the RECEIVER of the attribute read, so
! ``Color.__contains__'' recorded ``Color class'' although the method lives on
! ``Enum class'' several steps up.  __qualname__ named the subclass rather than
! the definer.  pydoc's docroutine prints a `` from X'' provenance note whenever
! ``imfunc.__qualname__'' disagrees with
! ``homecls.__qualname__ + '.' + realname'', and classify_class_attrs gets the
! home class RIGHT on its own -- so the two disagreed and every inherited method
! came out annotated `` from <module>.Color''.  Fixed by resolving definingClass
! to the class that actually implements the selector (both sides of the chain,
! unary form and the seven arity variants), and by reading the owner's
! __qualname__ through ___pyAttrLoad___ rather than sending it: a Smalltalk
! metaclass answers its PYTHON name ('EnumType') only on that path.
!
! BOUND OR UNBOUND.  Grail's ``object'' IS the kernel Object and every Python
! class descends from PythonInstance, so those two carry protocol FALLBACKS that
! CPython's object does not have: __getitem__ and __iter__ live on
! PythonInstance purely so an unsubscriptable object raises a catchable
! TypeError rather than a MessageNotUnderstood, and __contains__ is the same
! shape on object.  They are error messages wearing a method's clothes.  Grail's
! search of the class chain found one and stopped; CPython's search of
! cls.__mro__ finds NOTHING and falls through to the metatype.  pydoc keys on
! exactly that (``kind == 'method' and _is_bound_method(value)'' -> 'static
! method'), so three of an enum's four metaclass methods were filed as instance
! ``Methods'' and split from __len__ -- the one selector no root happens to
! define, which had been reaching the metaclass all along and sat by itself
! under ``Static methods''.
!
! THE GUARD THAT MATTERS MOST is that BOTH probes stop at the roots.  A
! Smalltalk metaclass chain also bottoms out at Object, so asking the class side
! the unrestricted question answers yes for anything object defines and the
! yield fires universally.  That is not hypothetical: it turned
! ``object.__getattribute__'' -- defined on object, and called in CPython's
! two-argument unbound form -- into a BoundMethod on the class, and every such
! call raised ``__getattribute__() takes a different number of arguments (2
! given)''.  The suite found it before the fixture did.
!
! Source fixture: tests/python/method_owner_and_metaclass.py
! ===============================================================================

doit
MethodOwnerAndMetaclassTestCase comment:
'Tests that a method reached off a class names the class that DEFINES it, and
that a Grail protocol fallback on the universal roots does not outrank a real
metaclass method.  Drives tests/python/method_owner_and_metaclass.py.'
%

doit
MethodOwnerAndMetaclassTestCase removeAllMethods.
MethodOwnerAndMetaclassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MethodOwnerAndMetaclassTestCase
setUp
	"Reload tests/python/method_owner_and_metaclass.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'method_owner_and_metaclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/method_owner_and_metaclass.py')
		name: 'method_owner_and_metaclass'.
%

category: 'Grail-Private'
method: MethodOwnerAndMetaclassTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Which class owns it'
method: MethodOwnerAndMetaclassTestCase
testAnInheritedMethodNamesTheClassThatDefinesIt
	"``EnumType.__contains__'', not ``Color.__contains__'' and not the two-word
	Smalltalk ``Enum class.__contains__''.  The module matters equally: it is
	the other half of the pair docroutine compares."

	self assert: (self resultAt: 'qualname') asString
		equals: '''EnumType.__contains__'''.
	self assert: (self resultAt: 'module') asString equals: '''enum'''.
%

category: 'Grail-Tests - Which class owns it'
method: MethodOwnerAndMetaclassTestCase
testTheOwnerAgreesWithWhatClassifyClassAttrsReports
	"Asserted as the COMPARISON rather than as two strings, because agreement is
	the thing that has to hold -- pydoc prints its provenance note precisely
	when it fails, and classify_class_attrs was already answering EnumType while
	the method said Color."

	self assert: (self resultAt: 'agrees_with_homecls') asString equals: 'True'.
	self assert: (self resultAt: 'homecls') asString equals: '''EnumType'''.
%

category: 'Grail-Tests - Bound or unbound'
method: MethodOwnerAndMetaclassTestCase
testAllFourEnumMetaclassMethodsAreBound
	"All four, because the bug was the SPLIT: __len__ is the one selector no
	universal root happens to define, so it alone reached the metaclass and the
	other three did not.  A fix that only moved one of them would look right in
	isolation."

	self assert: (self resultAt: 'all_bound') asString
		equals: '[True, True, True, True]'.
	self assert: (self resultAt: 'kinds') asString
		equals: '[''static method'', ''static method'', ''static method'', ''static method'']'.
	self assert: (self resultAt: 'homes') asString
		equals: '[''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'']'.
%

category: 'Grail-Tests - Bound or unbound'
method: MethodOwnerAndMetaclassTestCase
testAnOrdinaryMethodIsUntouched
	"The yield fires only for a ROOT fallback.  A real def on a real class still
	reads as the plain function CPython gives -- unbound, kind 'method' -- and
	an inherited one still names the class that defined it."

	self assert: (self resultAt: 'own_method_unbound') asString equals: 'False'.
	self assert: (self resultAt: 'own_method_kind') asString equals: '[''method'']'.
	self assert: (self resultAt: 'own_method_qualname') asString equals: '''Plain.own'''.
	self assert: (self resultAt: 'inherited_method_qualname') asString
		equals: '''Plain.own'''.
%

category: 'Grail-Tests - Bound or unbound'
method: MethodOwnerAndMetaclassTestCase
testTheUnboundTwoArgumentFormStillWorks
	"The regression the guard exists to prevent.  object.__getattribute__ is
	defined ON object, so an unrestricted ``does the class side define this''
	check answers yes and rebinds it -- and CPython's two-argument unbound call
	then raises ``takes a different number of arguments (2 given)''."

	self assert: (self resultAt: 'getattribute_unbound_call') asString
		equals: '''Color'''.
	self assert: (self resultAt: 'getattr_still_works') asString equals: '''Color'''.
%

category: 'Grail-Tests - Bound or unbound'
method: MethodOwnerAndMetaclassTestCase
testTheEnumProtocolStillRuns
	"Reclassifying how these READ must not change what they DO: len(), in,
	subscript and iteration all route through the same four selectors."

	self assert: (self resultAt: 'len_of_enum') asString equals: '2'.
	self assert: (self resultAt: 'contains') asString equals: 'True'.
	self assert: (self resultAt: 'getitem') asString equals: '1'.
	self assert: (self resultAt: 'iter') asString equals: '[''CYAN'', ''MAGENTA'']'.
%

set compile_env: 0
