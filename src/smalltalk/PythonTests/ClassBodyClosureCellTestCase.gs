! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyClosureCellTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyClosureCellTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyClosureCellTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyClosureCellTestCase
!
! A method compiled into a class can RUN during class construction, not only
! afterwards: Enum's metaclass hook calls each member's __init__/__new__ while it
! builds the members.
!
! ClassDefAst stored a class's closure cells AFTER the metaclass hook, and
! deliberately so -- the self-name cell has to hold the FINAL, decorated class.
! A method that ran during construction therefore read a cell that did not exist
! yet:
!
!     def outer():
!         limit = 255
!         class E(Enum):
!             A = 1
!             def __init__(self, v): self.lim = limit
!
! raised ``free variable 'limit' referenced before assignment in enclosing
! scope''.  The stores are now emitted BEFORE the hook as well as after; the
! emit is factored into ___emitClosureCellStoresOn:className:saved:savedWrite:
! and is idempotent (same blocks, and the captured sets are IdentitySets).
!
! Not enum-specific in nature -- any enclosing-function free variable is
! affected, a plain value as much as a class -- but the enum metaclass is what
! makes a method run early enough to notice.  PyEnumTypes had worked around the
! self-name case alone by pre-storing ___cell_<Name>___ so super() would resolve;
! that is now belt-and-braces rather than load-bearing.
!
! Fixes test_enum's test_raise_custom_error_on_creation and test_init_exception.
!
! Drives tests/python/class_body_closure_cells.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyClosureCellTestCase removeAllMethods.
ClassBodyClosureCellTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyClosureCellTestCase
setUp
	"Reload tests/python/class_body_closure_cells.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_closure_cells' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_closure_cells.py')
		name: 'class_body_closure_cells'.
%

category: 'Grail-Private'
method: ClassBodyClosureCellTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Read during construction'
method: ClassBodyClosureCellTestCase
testEnclosingValueReadFromMemberInit
	"The plain-value case: __init__ runs while members are built and reads an
	enclosing function local."

	self assert: (self resultAt: 'enclosing_value') equals: 255.
%

category: 'Grail-Tests - Read during construction'
method: ClassBodyClosureCellTestCase
testEnclosingClassRaisedFromMemberInit
	"test_enum test_raise_custom_error_on_creation: the free variable is an
	exception CLASS the member __init__ raises."

	self assert: (self resultAt: 'enclosing_class') asString
		equals: 'MyErr raised'.
%

category: 'Grail-Tests - Read during construction'
method: ClassBodyClosureCellTestCase
testEnclosingValueReadFromMemberNew
	"__new__ runs during construction too."

	self assert: (self resultAt: 'enclosing_via_new') equals: 101.
%

category: 'Grail-Tests - Existing behaviour preserved'
method: ClassBodyClosureCellTestCase
testCellsStillWorkAfterConstruction
	"The long-standing case, and BY REFERENCE: a value rebound after the class
	statement is still seen (CPython closure-cell semantics)."

	self assert: (self resultAt: 'after_construction') asString
		equals: 'first/second'.
%

category: 'Grail-Tests - Existing behaviour preserved'
method: ClassBodyClosureCellTestCase
testSelfNameCellHoldsTheDecoratedClass
	"Why the stores are REPEATED after the decorator loop: a method naming its
	own class must see the decorated object."

	self assert: (self resultAt: 'decorated') asString equals: 'True/True'.
%

category: 'Grail-Tests - Existing behaviour preserved'
method: ClassBodyClosureCellTestCase
testNonlocalWriteCellsStillReachTheEnclosingScope
	"The setter cells are emitted by the same helper, so they move too."

	self assert: (self resultAt: 'writer') equals: 2.
%
