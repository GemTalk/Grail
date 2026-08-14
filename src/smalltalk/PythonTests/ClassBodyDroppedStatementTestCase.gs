! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyDroppedStatementTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyDroppedStatementTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyDroppedStatementTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyDroppedStatementTestCase
!
! Two class-body statement kinds Grail used to DROP.
!
! CPython runs a class body top to bottom, so every statement in it executes at
! class-definition time.  Grail compiles the body STRUCTURALLY -- it scans for
! the names the body binds and emits one store per name -- so a statement that
! yields no class-attribute pair had nothing to emit and was discarded whole,
! with no error anywhere:
!
!     class C:
!         d = {}
!         d['a'] = 1       -- target is a SUBSCRIPT, not a name: dropped
!         k = d['a']       -- KeyError
!
!     class C:
!         x = 1
!         del x            -- binds nothing: dropped, hasattr(C, 'x') was true
!
! This is the same shape as the ``try''/``for''/``while''/``with'' gap
! (ClassBodyLoopsTestCase) and the ``nonlocal'' and ``global'' ones -- a body
! statement with no attribute pair -- and it is fixed the same way, by emitting
! the statement through its own printSmalltalkOn:.
!
! AT ITS SOURCE POSITION, interleaved with the attribute stores rather than in a
! pass after them, because either kind can change what a LATER attribute value
! reads.  testSubscriptAssignRunsInSourceOrder pins that directly; a trailing
! pass answers ( true true ) there, since every attribute value has been computed
! by the time the write runs.  That is not a hypothetical -- the ``global'' case
! shipped with a trailing pass once and regressed test_listcomps.
!
! ``del'' NEEDS THE CLASS, and the two emits that already existed would both have
! been wrong for it: the module one binds the wrong scope, and the function-local
! one (``x := nil'') would nil the ENCLOSING def's temp -- precisely the binding
! CPython leaves alone.  It routes through
! object >> ___classBodyDefinitionalDelete___:, which looks in all three places a
! class-body binding can live (accessor pair, dynamic holder, prepared
! namespace), because which one holds it is not knowable at emit time.
!
! An accessor pair is REMOVED rather than nilled.  Nilling looks like the
! nil-as-absent rule the class-body reads use, but ___pyAttrLoad___ does not
! apply it to a class accessor: it answered the nil, so ``del x'' left C.x
! reading back as a raw UndefinedObject -- a worse answer than not honouring the
! statement at all.
!
! NOT covered, and the one class-body ``del'' shape still dropped: a name the
! body declared ``global'' or ``nonlocal''.  That one names another scope's
! binding, so there is no class attribute to unbind and it needs the
! enclosing-scope emit instead.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/class_body_dropped_statement.py under it directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyDroppedStatementTestCase removeAllMethods.
ClassBodyDroppedStatementTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ClassBodyDroppedStatementTestCase
setUp
	"Reload tests/python/class_body_dropped_statement.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_dropped_statement' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_dropped_statement.py')
		name: 'class_body_dropped_statement'.
%

category: 'Grail-Tests'
method: ClassBodyDroppedStatementTestCase
testSubscriptAssignRuns
	"THE BUG.  The write was dropped, so the read that follows it raised
	KeyError."

	self assert: testModule @env1:subscript_assign_runs asArray first equals: 1.
%

category: 'Grail-Tests'
method: ClassBodyDroppedStatementTestCase
testSubscriptAssignRunsInSourceOrder
	"THE ORDERING CASE.  ``before'' is computed ahead of the write and
	``after'' behind it, so emitting the write in a pass after the attributes
	answers ( true true )."

	self assert: testModule @env1:subscript_assign_runs_in_source_order asArray
		equals: #( false true ).
%

category: 'Grail-Tests'
method: ClassBodyDroppedStatementTestCase
testDelRemovesAClassAttribute
	"The name is GONE, not emptied: hasattr is false and the read raises
	AttributeError, which is what removing the accessor pair buys over nilling
	its slot."

	self assert: testModule @env1:del_removes_a_class_attribute asArray
		equals: #( false 'AttributeError' ).
%

category: 'Grail-Tests'
method: ClassBodyDroppedStatementTestCase
testDelOfAnUnboundNameRaises
	"CPython's class-body ``del'' is DELETE_NAME on the body's own namespace,
	so it raises rather than quietly reaching the module global or the
	enclosing local of that name."

	self assert: testModule @env1:del_of_an_unbound_name_raises equals: 'NameError'.
%

category: 'Grail-Tests'
method: ClassBodyDroppedStatementTestCase
testDelDoesNotReachTheEnclosingLocal
	"The enclosing def binds ``x'' too.  Emitting the ordinary function-local
	delete (``x := nil'') would have nilled THAT temp -- this is why the class
	body needs a delete of its own rather than either existing branch."

	self assert: testModule @env1:del_does_not_reach_the_enclosing_local asArray
		equals: #( false 7 ).
%

category: 'Grail-Tests'
method: ClassBodyDroppedStatementTestCase
testDelInAMethodIsStillALocal
	"A method is a FUNCTION scope.  The class-body routing keys off a flag
	ClassDefAst sets only around class-body-level statements, so a ``del''
	inside a method keeps the local emit and its UnboundLocalError."

	self assert: testModule @env1:del_in_a_method_is_still_a_local
		equals: 'UnboundLocalError'.
%

category: 'Grail-Tests'
method: ClassBodyDroppedStatementTestCase
testDelLeavesTheOtherAttributesAlone
	"Only the named binding goes -- the delete is by name, not a reset of the
	class's attribute set."

	self assert: testModule @env1:del_leaves_the_other_attributes_alone asArray
		equals: #( false 2 ).
%

category: 'Grail-Tests'
method: ClassBodyDroppedStatementTestCase
testDelOfASubscriptStillWorks
	"A target carrying its own receiver needs no class routing and keeps the
	emit it always had; it was simply never reached at class-body level."

	self assert: (testModule @env1:del_of_a_subscript_still_works
		collect: [:pair | pair asArray]) asArray
			equals: (Array with: #( 'b' 2 )).
%
