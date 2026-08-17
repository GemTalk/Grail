! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassCellTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassCellTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassCellTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassCellTestCase
!
! ``__classcell__'' is injected, handed to the metaclass, and filled.
!
! CPython's compiler puts a __classcell__ entry into the class namespace at the
! end of a class body, but ONLY when a method needs it.  The entry is an EMPTY
! cell; type.__new__ fills it with the finished class.  A metaclass sits in
! between and is trusted to hand the namespace on -- which is the only reason
! any of this is observable, and why it could not be built until the metaclass
! actually ran (the previous step).
!
! GRAIL DOES NOT READ THIS CELL.  ``__class__'' is resolved LEXICALLY here --
! codegen emits the defining class directly (CallAst >> printDefiningClassOn:)
! -- so the cell is not what makes ``__class__'' work.  What it has to be right
! about is everything a metaclass can OBSERVE and DO: present exactly when
! CPython says, empty on arrival, holding the class afterwards, and refusing to
! be dropped or re-pointed.
!
! WHEN IS IT NEEDED.  The condition is decided at the points that compile a
! class reference, not by a separate scan of the body, so it cannot drift from
! what actually reads the class: printDefiningClassOn: (the bare name
! ``__class__''), the zero-arg ``super()'' rewrite, the explicit
! ``super(C, self)'' rewrite, and the bare name ``super''.
!
! THE LAST OF THOSE WAS A CORRECTION.  This test case originally asserted that
! an EXPLICIT ``super(C, self)'' gets no cell, on the reasoning that it names
! its class and needs nothing implicit.  CPython disagreed when the fixture was
! run against it: the symbol table creates the __class__ cell for any method
! that references the NAME ``super'', without waiting to see the zero-argument
! form.  The fixture caught it because it is checked against real CPython
! rather than against what seemed reasonable.
!
! AN EMPTY CELL RAISES.  CPython distinguishes an unset cell from one holding
! None, and a metaclass may look before type.__new__ has filled it.  PyCell >>
! cell_contents only raises when its READER BLOCK is nil, which is never true
! for this cell, so the empty case is expressed INSIDE the block with an
! explicit filled flag -- a nil test would have reported None for an empty cell.
!
! STILL NOT DONE: test_super's test___classcell___expected_behaviour asserts
! ``WithClassRef.f.__closure__[0] is class_cell'', and UnboundMethod has no
! __closure__ at all.  That is method introspection rather than the class-cell
! protocol, with its own blast radius, so it is left out rather than bolted on.
!
! Measured: test_super 18 -> 16 failing, no regression across the corpus.
! Every expectation is CPython 3.14.6's own output for tests/python/class_cell.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassCellTestCase removeAllMethods.
ClassCellTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassCellTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_cell' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_cell.py')
		name: 'class_cell'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: ClassCellTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- present exactly when a method needs it ---

category: 'Grail-Tests - When it appears'
method: ClassCellTestCase
testNoCellWhenNoMethodAsksForTheClass
	"CPython omits the entry entirely for a body whose methods never reference
	the class.  Asserted as firmly as the presence cases -- injecting one
	unconditionally would be just as wrong, and a metaclass can see it."

	self assert: (self at: 'omitted_when_unused') equals: false.
%

category: 'Grail-Tests - When it appears'
method: ClassCellTestCase
testCellForABareClassReference
	"``def f(self): return __class__''."

	self assert: (self at: 'present_for_name') equals: true.
%

category: 'Grail-Tests - When it appears'
method: ClassCellTestCase
testCellForZeroArgSuper
	"``super()'' needs the class, so the cell comes with it."

	self assert: (self at: 'present_for_zero_arg_super') equals: true.
%

category: 'Grail-Tests - When it appears'
method: ClassCellTestCase
testCellForExplicitSuperToo
	"``super(C, self)'' gets one as well, which is NOT what this test case
	first claimed.  CPython's symbol table creates the implicit __class__ cell
	for any method referencing the NAME ``super'', without waiting to see the
	zero-argument form; the fixture asserted the opposite and real CPython
	corrected it."

	self assert: (self at: 'present_for_explicit_super') equals: true.
%

! --- the lifecycle ---

category: 'Grail-Tests - Lifecycle'
method: ClassCellTestCase
testTheCellArrivesEmptyAndIsFilledWithTheClass
	"The ordering the protocol exists to express: the metaclass sees the cell
	BEFORE the class exists, and type.__new__ fills it as the class comes into
	being.  An unset cell raises ValueError rather than answering None, which
	needed an explicit filled flag -- a nil test cannot tell the two apart."

	self assert: (self at: 'empty_on_arrival') @env0:asString equals: 'ValueError'.
	self assert: (self at: 'filled_with_class') equals: true.
%

category: 'Grail-Tests - Lifecycle'
method: ClassCellTestCase
testTheCellIsProtocolNotAClassAttribute
	"CPython CONSUMES __classcell__ in type.__new__.  Copying it across with
	the rest of the namespace would leave a stray attribute on every class
	whose methods mention __class__."

	self assert: (self at: 'not_a_class_attr') equals: false.
%

category: 'Grail-Tests - Lifecycle'
method: ClassCellTestCase
testClassResolutionIsUnaffected
	"Grail resolves ``__class__'' lexically and does not read this cell, so the
	whole feature must be observable without changing what __class__ answers."

	self assert: (self at: 'class_still_resolves') equals: true.
%

! --- what a metaclass may not do ---

category: 'Grail-Tests - Refusals'
method: ClassCellTestCase
testDroppingTheCellIsARuntimeError
	"A metaclass that pops the entry has broken the contract: the class it
	returns would have a dead ``__class__''.  CPython names the class and asks
	whether __classcell__ was propagated to type.__new__."

	self assert: (self at: 'drop_rejected') @env0:asString equals: 'RuntimeError'.
%

category: 'Grail-Tests - Refusals'
method: ClassCellTestCase
testDroppingIsHarmlessForAClassThatNeverAsked
	"The SAME popping metaclass over a body with no class reference is fine --
	there was no cell to lose.  This is what keeps the RuntimeError specific to
	a real breach instead of firing on any metaclass that tidies its namespace."

	self assert: (self at: 'drop_harmless_without_ref') @env0:asString
		equals: '5'.
%

category: 'Grail-Tests - Refusals'
method: ClassCellTestCase
testReplacingTheCellWithANonCellIsATypeError
	"``ns['__classcell__'] = 'not a cell'''."

	self assert: (self at: 'replace_rejected') @env0:asString equals: 'TypeError'.
%

category: 'Grail-Tests - Refusals'
method: ClassCellTestCase
testPointingAFilledCellAtASecondClassIsATypeError
	"A metaclass builds ANOTHER class from the namespace it was handed, whose
	cell is by then filled with the first.  Re-pointing it would leave the
	first class's methods reading the second.

	This is what made the three-argument ``type(name, bases, ns)'' builder have
	to care: it is the same constructor, reached by a different road, and the
	check had to be shared rather than living only on the class-statement path."

	self assert: (self at: 'second_class_rejected') @env0:asString
		equals: 'TypeError'.
%
