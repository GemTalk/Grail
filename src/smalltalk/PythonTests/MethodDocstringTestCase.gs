! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MethodDocstringTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MethodDocstringTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MethodDocstringTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MethodDocstringTestCase
!
! A class-body ``def'' compiles to a Smalltalk METHOD, not a block, so it cannot
! carry the def-time ``___pyNamed___:doc:'' stamp that gives a nested def its
! ``__doc__''.  Nothing captured the docstring, so the read fell all the way
! through to Object''s own __doc__ and EVERY method -- plain, @property,
! @staticmethod, @classmethod -- reported "The base class of the class
! hierarchy...".  A nested def was fine, which is what made it easy to miss.
!
! ClassDefAst now compiles a class-side ``___methodDocTable___'' (method name ->
! docstring), the same shape as the annotations and signature tables and for the
! same reason; BoundMethod and UnboundMethod walk the superclass chain reading
! it.  The table is only emitted for a class that has at least one documented
! method, so the undocumented cases below also cover the no-table path.
!
! The absent answer is None, NOT Object''s docstring: functools.update_wrapper
! copies __doc__, so an inherited default propagated the wrong text onto every
! wrapper it touched.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MethodDocstringTestCase removeAllMethods.
MethodDocstringTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MethodDocstringTestCase
setUp
	"Reload tests/python/method_docstrings.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'method_docstrings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_docstrings.py')
		name: 'method_docstrings'.
%

category: 'Grail-Tests'
method: MethodDocstringTestCase
testEveryMethodShapeReportsItsDocstring
	"Plain method, @property, @staticmethod and @classmethod all read through
	the same table, so all four must answer their own text."

	self assert: testModule @env1:method_docstrings asArray equals: #(
		'method docstring' 'property docstring'
		'static docstring' 'classmethod docstring' ).
%

category: 'Grail-Tests'
method: MethodDocstringTestCase
testBoundAccessMatchesUnbound
	"BoundMethod and UnboundMethod read the same table, so ``d.meth.__doc__''
	and ``Cls.meth.__doc__'' must agree."

	| r |
	r := testModule @env1:bound_matches_unbound asArray.
	self assert: (r at: 1) equals: true.
	self assert: (r at: 2) equals: 'method docstring'.
%

category: 'Grail-Tests'
method: MethodDocstringTestCase
testUndocumentedIsNoneNotObjectsDocstring
	"The defect itself.  An undocumented method answers None -- inheriting
	Object''s __doc__ made every one of them claim to be documented, and
	functools.update_wrapper copied that text onto wrappers.

	The second and third cases use a class with NO documented method at all,
	which therefore has no ___methodDocTable___ compiled: the walk has to
	answer None rather than fall through."

	self assert: testModule @env1:undocumented_is_none asArray
		equals: #( true true true ).
%

category: 'Grail-Tests'
method: MethodDocstringTestCase
testClassDocstringsStillWork
	"Class docstrings came from a different path and already worked; keep it."

	| r |
	r := testModule @env1:class_docstrings_still_work asArray.
	self assert: (r at: 1) equals: 'class docstring'.
	self assert: (r at: 2) equals: true.
%

category: 'Grail-Tests'
method: MethodDocstringTestCase
testInheritedMethodReportsItsDefiningClass
	"The superclass walk: an inherited method reports the docstring from where
	it was defined, and an override reports its own."

	self assert: testModule @env1:inherited_reports_defining_class asArray
		equals: #( 'method docstring' 'overridden docstring' ).
%

category: 'Grail-Tests'
method: MethodDocstringTestCase
testNestedDefStillCarriesItsOwnStamp
	"A nested def gets __doc__ from the def-time cascade, not the table.  That
	path always worked and must stay working."

	| r |
	r := testModule @env1:nested_def_unaffected asArray.
	self assert: (r at: 1) equals: 'inner docstring'.
	self assert: (r at: 2) equals: true.
%
