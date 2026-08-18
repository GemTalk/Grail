! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MethodClassCellClosureTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MethodClassCellClosureTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MethodClassCellClosureTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MethodClassCellClosureTestCase
!
! ``method.__closure__'' AND THE IMPLICIT ``__class__'' CELL.
!
! CPython's compiler gives a method an implicit closure over ONE cell when its
! body reads ``__class__'' -- by name, or through a zero-argument ``super()'',
! which is the same read spelled differently.  The cell is handed to the
! metaclass as ``__classcell__'' and filled by type.__new__ with the finished
! class.  Grail already did all of that.  What it did not do was let anything
! read the closure BACK: ``Cls.f.__closure__'' raised AttributeError, which is
! test_super's test___classcell___expected_behaviour (now passing; test_super
! 6 -> 5).
!
! TWO THINGS MAKE THIS MORE THAN AN ACCESSOR, and both are tested here.
!
! IT IS PER METHOD, NOT PER CLASS.  Two methods of ONE class body disagree: the
! one that reads ``__class__'' gets a one-tuple, its sibling gets None.  Grail's
! existing record was a single class-wide flag -- classNeedsClassCell, which
! asks ``does ANY method need a cell'', exactly the right question for whether
! to inject __classcell__ and exactly the wrong one here.  Answering from it
! would have given both methods the same answer, right for the test that
! motivated the work and wrong for every other method on the class.  So
! CallAst now also records WHICH class-body def asked
! (___recordClassCellMethod___), against the class-body-level def rather than
! the innermost one -- a nested function's read makes the METHOD containing it
! close over the cell, and the method is what __closure__ is asked about.
!
! ORDINARY CLASSES HAD NO CELL AT ALL.  The cell was created only when a
! metaclass was watching, because the injection point is the namespace and there
! is no namespace otherwise.  That was invisible for as long as nothing read one
! back: Grail resolves ``__class__'' LEXICALLY and never consults the cell to
! answer it.  CPython creates the cell either way, so ___grailBindClassCell___
! now runs for every class that needs one -- after the metaclass dispatch, so it
! holds the class type.__new__ produced, and BEFORE the class decorators,
! because CPython's cell holds the UNDECORATED class.
!
! The identity checks are the point of the metaclass pair: the cell the
! metaclass was handed must BE the cell in the method's closure, not an equal
! one.  That is why the cell is kept on the class (under a ``___''-prefixed key,
! which the attribute machinery hides from __dict__ and dir(), since CPython
! does not turn __classcell__ into a class attribute either) rather than
! reconstructed on demand.
!
! KNOWN GAP, deliberately not covered: Grail reports only the CLASS cell.  A
! method that also closes over an enclosing function's locals -- which Grail
! reaches through its own per-class cell store -- would have those in the tuple
! under CPython.  Nothing in the corpus reads them.
!
! Fixture: tests/python/method_class_cell_closure.py (self-verifying under
! CPython 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: MethodClassCellClosureTestCase
setUp
	probe := self ___loadProbe___: 'method_class_cell_closure'.
%

category: 'Grail-Private'
method: MethodClassCellClosureTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: MethodClassCellClosureTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the metaclass half: identity between __classcell__ and __closure__ ---

category: 'Grail-Tests - Metaclass'
method: MethodClassCellClosureTestCase
testTheClosureHoldsTheVerySameCellTheMetaclassSaw
	"Identity, not equality.  This is what makes the cell something that has to
	be KEPT on the class rather than built on demand when __closure__ is asked
	-- and it is the assertion test_super makes."

	self assert: (self at: 'closure_holds_the_very_same_cell') equals: true.
	self assert: (self at: 'closure_is_a_one_tuple') equals: true.
	self assert: (self at: 'classcell_is_filled_with_the_class') equals: true.
%

category: 'Grail-Tests - Metaclass'
method: MethodClassCellClosureTestCase
testACellIsInjectedOnlyWhenAMethodAsksForOne
	"Both halves of CPython's rule, which test_super asserts as firmly as the
	other: a class whose methods never mention ``__class__'' gets NO
	__classcell__ in its namespace."

	self assert: (self at: 'no_ref_gets_no_classcell') equals: true.
	self assert: (self at: 'ref_gets_a_classcell') equals: true.
%

category: 'Grail-Tests - Metaclass'
method: MethodClassCellClosureTestCase
testTheCellDoesNotBecomeAClassAttribute
	"``WithClassRef.__classcell__'' must raise.  The cell is kept on the class
	for __closure__ to find, so this is the check that the key it is kept under
	stays invisible to Python-level attribute access."

	self assert: (self at: 'classcell_is_not_an_attribute') @env0:asString
		equals: 'AttributeError'.
%

! --- plain classes: no metaclass is watching anywhere below ---

category: 'Grail-Tests - Per method'
method: MethodClassCellClosureTestCase
testASiblingMethodThatAsksForNothingHasNoClosure
	"THE CHECK A CLASS-WIDE IMPLEMENTATION PASSES ONLY BY ACCIDENT.  Two
	methods of ONE class body: the one reading ``__class__'' has a closure, its
	sibling answers None.  classNeedsClassCell cannot tell them apart, which is
	why the per-method record exists."

	self assert: (self at: 'plain_method_closure_is_none') equals: true.
	self assert: (self at: 'reading_method_has_a_closure') equals: true.
%

category: 'Grail-Tests - Per method'
method: MethodClassCellClosureTestCase
testAnOrdinaryClassGetsACellToo
	"No metaclass anywhere in this half of the fixture.  The cell used to be
	created only at the namespace injection point, which an ordinary class
	never reaches -- so every check below this line failed against the first
	implementation while the metaclass ones above passed."

	self assert: (self at: 'reading_method_has_a_closure') equals: true.
	self assert: (self at: 'nested_read_still_resolves') equals: true.
%

category: 'Grail-Tests - Per method'
method: MethodClassCellClosureTestCase
testAnInheritedMethodReportsTheDefiningClassesCell
	"``Sub.reads'' closes over BASE's cell: a method closes over the class whose
	body it appeared in, not the one it is reached through.  Same rule the
	metadata tables follow, and the reason the lookup walks the MRO to find the
	class that OWNS the record."

	self assert: (self at: 'inherited_cell_is_the_defining_class') equals: true.
%

category: 'Grail-Tests - Per method'
method: MethodClassCellClosureTestCase
testZeroArgSuperCountsAsReadingClass
	"The other spelling of the same read.  In Grail it is a SEPARATE emit path
	-- it builds the Super proxy itself rather than going through
	printDefiningClassOn: -- so it has to make the same record, and did not
	until this change."

	self assert: (self at: 'zero_arg_super_closes_over_the_cell') equals: true.
%

category: 'Grail-Tests - Per method'
method: MethodClassCellClosureTestCase
testStaticAndClassMethodsReportTheClosureToo
	"Reached off the class, these are a BoundMethod in Grail rather than an
	UnboundMethod -- a different handle kind with its own attribute table.  The
	plain-method read answered while both of these still raised."

	self assert: (self at: 'staticmethod_has_the_closure') equals: true.
	self assert: (self at: 'classmethod_has_the_closure') equals: true.
%

category: 'Grail-Tests - Per method'
method: MethodClassCellClosureTestCase
testANestedFunctionsReadBelongsToTheEnclosingMethod
	"``__class__'' read inside a def nested in a method: the closure belongs to
	the METHOD, since that is the object __closure__ is asked about.  The record
	is therefore made against the class-body-level def, not the innermost one."

	self assert: (self at: 'nested_read_gives_the_method_a_closure') equals: true.
	self assert: (self at: 'nested_cell_is_the_class') equals: true.
%
