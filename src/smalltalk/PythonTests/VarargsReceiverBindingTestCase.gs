! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'VarargsReceiverBindingTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
VarargsReceiverBindingTestCase comment:
'A method written ``def m(*args)'' binds the receiver as args[0].

CPython gives a method with NO named parameter its receiver through
*args: ``c.m(1)'' is ``(c, 1)'' and ``c.m()'' is ``(c,)''.  Grail''s class
instance-method generator strips the FIRST declared parameter and binds
the Smalltalk receiver to it -- so with nothing declared there was
nothing to strip and the receiver was dropped: ``(1,)'' and ``()''.
``def m(self, *args)'' names a parameter to strip and was always right,
which is why only this spelling was affected.

The guard is ``allParameterNames isEmpty'' in
FunctionDefAst >> generateMethodSourceOn:, and its scope falls out of
which generator ClassDefAst picks:

  * instance methods -- receiver prepended, CPython''s args[0];
  * CLASS-side methods share this generator, and want the same thing: a
    ``@classmethod def m(*args)'' gets the class as args[0] in CPython,
    and on a class-side Smalltalk method the receiver IS the class;
  * @staticmethod must get NONE, and does not -- ClassDefAst compiles
    those with generateModuleMethodSourceOn:, right by construction,
    since a static method has no receiver to contribute.

Took test.test_genericclass 8 -> 7 (test_class_getitem, whose hook is
written ``def __class_getitem__(*args, **kwargs)'').

See tests/python/varargs_receiver_binding.py (11 checks,
CPython-validated first).'
%

expectvalue /Class
doit
VarargsReceiverBindingTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
VarargsReceiverBindingTestCase removeAllMethods: 0.
VarargsReceiverBindingTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: VarargsReceiverBindingTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'varargs_receiver_binding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/varargs_receiver_binding.py')
		name: 'varargs_receiver_binding'.
%

category: 'Grail-Helpers'
method: VarargsReceiverBindingTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: VarargsReceiverBindingTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: VarargsReceiverBindingTestCase
testTheReceiverArrivesInArgs
	"With arguments, without arguments, alongside **kwargs, and through
	the class where the receiver is passed explicitly and must arrive
	exactly once."

	self assertAll: #('receiver_is_first_arg' 'receiver_alone_when_no_args'
		'receiver_with_kwargs' 'unbound_call_keeps_both')
%

category: 'Grail-Tests'
method: VarargsReceiverBindingTestCase
testTheOtherSpellingsAreUnchanged
	"A named self is still stripped, a staticmethod still gets no
	receiver, and a classmethod gets the CLASS whether or not cls is
	named -- the three boundaries this guard must not cross."

	self assertAll: #('named_self_unaffected' 'named_self_with_positional'
		'staticmethod_gets_no_receiver' 'classmethod_named_cls'
		'classmethod_unnamed_cls')
%

category: 'Grail-Tests'
method: VarargsReceiverBindingTestCase
testClassGetitemSeesItsClass
	"The corpus shape: __class_getitem__ written with bare *args sees the
	class, and a subclass's subscript sees the SUBCLASS."

	self assertAll: #('class_getitem_sees_the_class'
		'class_getitem_sees_the_subclass')
%
