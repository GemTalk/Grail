! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyExpressionStatementTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyExpressionStatementTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyExpressionStatementTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyExpressionStatementTestCase
!
! A bare EXPRESSION statement in a class body, which CPython executes at
! class-definition time like any other body statement:
!
!     class Foo(Enum):
!         vars().update({'FOO_CAT': 'aloof', 'FOO_HORSE': 'big'})
!
! Grail compiles a class body STRUCTURALLY -- it scans the body for the names it
! binds and emits one store per name -- so a statement that binds no name
! carried no classBodyAttributePairs and was DROPPED whole.  A class-body
! ``print(...)'' produced no output and no error; the idiom above, which is how
! test_enum defines members computed at runtime, silently produced an enum with
! no members at all.
!
! THREE parts.
!
! (1) ClassDefAst EMITS the statement, joining the try / for / while / with
!     statements that were already emitted verbatim for the same reason.  The
!     docstring is excluded with the other pure constants: the leading bare
!     string is not evaluated for effect, it is lifted into __doc__.
!
! (2) ClassBodyLocals routes its MUTATORS through __setitem__ / __delitem__.
!     dict's own store with at:put: -- right for a dict, since CPython's
!     dict.update does not call a subclass's __setitem__ either, but wrong for a
!     namespace whose whole job is to be connected to the class.  Subscript
!     assignment already went through __setitem__ and worked, so ``.update()''
!     was the one shape that silently dropped everything.
!
! (3) NameAst's doit fallback stops counting a class-level name as a
!     declaration for a read inside a class-body COMPREHENSION.  Emitting (1)
!     exposed it: isVariableIsDeclared: goes class-body-blind when it climbs out
!     of a def or a lambda but not out of a comprehension, which is equally a
!     scope of its own in Python 3.  So ``[x + y for x in ...]'' next to a
!     class-level ``y'' emitted a bare ``y'', and under exec -- where there is
!     no module dictionary to resolve it -- the SMALLTALK compiler rejected the
!     whole exec with ``undefined symbol y'' before running a line.  CPython
!     raises a plain NameError there (the comprehension skips class scope), which
!     is what the fallback emits now.  That also cured three pre-existing
!     CompileErrors of the same family in test_listcomps.
!
! (4) NamedExprAst raises CPython's SyntaxError for a WALRUS inside a class-body
!     comprehension.  PEP 572 forbids it -- a walrus binds in the scope
!     ENCLOSING the comprehension, and a comprehension cannot write to a class
!     namespace -- and CPython rejects it at compile time.  Grail had no
!     complaint only because the statement was dropped; emitting it made the
!     target another uncatchable ``undefined symbol''.
!
! test_enum test_dynamic_members_with_static_methods; test_listcomps 24 -> 21;
! test_named_expressions 37 -> 36.
! The class-body namespace stays a snapshot for READS -- see
! docs/Class_Body_Namespace.md -- and nothing here depends on reading a name back.
!
! The fixture is self-running (docs/Testing_Guide.md): all eight checks answer
! True under CPython 3.14 too, so the agreement is machine-checked.
!
! Drives tests/python/class_body_expression_statements.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyExpressionStatementTestCase removeAllMethods.
ClassBodyExpressionStatementTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyExpressionStatementTestCase
setUp
	"Reload tests/python/class_body_expression_statements.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_expression_statements' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_expression_statements.py')
		name: 'class_body_expression_statements'.
%

category: 'Grail-Private'
method: ClassBodyExpressionStatementTestCase
check: aName
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil
%

category: 'Grail-Tests - The statement runs'
method: ClassBodyExpressionStatementTestCase
testABareCallRuns
	"The whole statement used to vanish, side effect and all."

	self assert: (self check: #'a_bare_call_runs') equals: true.
%

category: 'Grail-Tests - The statement runs'
method: ClassBodyExpressionStatementTestCase
testADocstringIsNotExecutedAsAStatement
	"The leading bare string is lifted into __doc__, not evaluated -- so it is
	excluded, along with every other pure constant."

	self assert: (self check: #'a_docstring_is_not_executed_as_a_statement') equals: true.
%

category: 'Grail-Tests - Mutating the namespace'
method: ClassBodyExpressionStatementTestCase
testVarsUpdateDefinesClassAttributes
	"``.update()'' has to reach the class the way ``vars()[k] = v'' already did."

	self assert: (self check: #'vars_update_defines_class_attributes') equals: true.
%

category: 'Grail-Tests - Mutating the namespace'
method: ClassBodyExpressionStatementTestCase
testVarsUpdateKeywordFormDefinesThemToo
	"The varargs form needs its own routing: dict's stores the keywords with
	at:put: directly rather than delegating."

	self assert: (self check: #'vars_update_keyword_form_defines_them_too') equals: true.
%

category: 'Grail-Tests - Mutating the namespace'
method: ClassBodyExpressionStatementTestCase
testVarsSetdefaultDefinesOne
	"An insertion binds; a key already present is answered untouched."

	self assert: (self check: #'vars_setdefault_defines_one') equals: true.
%

category: 'Grail-Tests - Enum members'
method: ClassBodyExpressionStatementTestCase
testVarsUpdateDefinesEnumMembers
	"The shape test_enum uses -- members computed at class-definition time."

	self assert: (self check: #'vars_update_defines_enum_members') equals: true.
%

category: 'Grail-Tests - Enum members'
method: ClassBodyExpressionStatementTestCase
testADuplicateMemberIsStillRefused
	"The write reaches enum's namespace, so the namespace can REFUSE it.  A
	bulk store that bypassed __setitem__ would take the last value silently."

	self assert: (self check: #'a_duplicate_member_is_still_refused') equals: true.
%

category: 'Grail-Tests - Comprehension scope'
method: ClassBodyExpressionStatementTestCase
testAClassBodyComprehensionSkipsClassScope
	"A comprehension is its own scope and does not see the class namespace, so
	the name is a global read.  Under exec a bare identifier for it is a
	SMALLTALK CompileError that kills the whole exec; CPython raises NameError."

	self assert: (self check: #'a_class_body_comprehension_skips_class_scope') equals: true.
%

category: 'Grail-Tests - Comprehension scope'
method: ClassBodyExpressionStatementTestCase
testAClassBodyComprehensionMayNotWalrus
	"PEP 572 forbids it: a walrus binds in the scope ENCLOSING the
	comprehension, and a comprehension cannot write to a class namespace, so
	CPython refuses the program at compile time rather than pick an answer.
	Grail had no complaint only because the statement was dropped; emitting it
	turned the name into a Smalltalk CompileError, which Python cannot catch."

	self assert: (self check: #'a_class_body_comprehension_may_not_walrus') equals: true.
%

category: 'Grail-Tests - Comprehension scope'
method: ClassBodyExpressionStatementTestCase
testAWalrusInAMethodComprehensionIsFine
	"Guard rail.  The enclosing scope is then the function, not the class, so
	the rule above must not fire."

	self assert: (self check: #'a_walrus_in_a_method_comprehension_is_fine') equals: true.
%
