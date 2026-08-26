! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'DecoratorLocalBaseTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
DecoratorLocalBaseTestCase comment:
'Decorators on class-body defs apply in every nesting, whatever names them.

The silent drop this pins the fix for: an ATTRIBUTE decorator whose base
was an enclosing def''s LOCAL (``import types'' in the method,
``@types.coroutine'' on the nested class''s def) never applied.  The
method-decorator chain emits INLINE in whatever scope emits the classdef --
where the method''s temp is a reachable bare identifier -- but it never
claimed inDecoratorEmit, the flag class decorators raise and whose
exclusion NameAst >> ___readsThroughClassCell___ documents.  The base
therefore emitted the METHOD-BODY closure-cell read, wrong twice at that
position (cells stored after the loop; self the wrong receiver), and the
application handler swallowed the raise as designed.  One
save/set/restore of the flag in
FunctionDefAst >> printMethodDecoratorsOn:... fixes all six rows of the
probe matrix (docs/Issues.md keeps the diagnosis).

test_asyncgen''s test_python_async_iterator_types_coroutine_anext -- whose
@types.coroutine __anext__ lives in exactly the failing shape -- passes
with this.

See tests/python/decorator_local_base.py (7 checks, CPython-validated
first; the marker probe defaults vacuous-true under CPython, where the
Grail result mark rightly does not exist).'
%

expectvalue /Class
doit
DecoratorLocalBaseTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
DecoratorLocalBaseTestCase removeAllMethods: 0.
DecoratorLocalBaseTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: DecoratorLocalBaseTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'decorator_local_base' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/decorator_local_base.py')
		name: 'decorator_local_base'.
%

category: 'Grail-Helpers'
method: DecoratorLocalBaseTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: DecoratorLocalBaseTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: DecoratorLocalBaseTestCase
testTheProbeMatrix
	"All six rows -- five that always worked, pinned so a regression names
	its row, and the one that did not."

	self assertAll: #('bare_global_on_module_class' 'bare_local_in_function'
		'attr_instance_global_in_method' 'attr_local_in_method'
		'module_attr_off_local_import_in_method'
		'class_body_reads_of_locals_unaffected')
%

category: 'Grail-Tests'
method: DecoratorLocalBaseTestCase
testTheConsequenceThatFoundIt
	"CPython's own test shape: @types.coroutine __anext__ in a method-nested
	class, accepted by anext()'s awaitable via the result mark."

	self assertAll: #('decorated_anext_in_method_nested_class_is_accepted')
%
