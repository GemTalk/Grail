! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CallableReprTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CallableReprTestCase comment:
'A callable''''s repr has to say WHICH callable it is.

Every callable printed as ``<BoundMethod object at 0x...>'''' or ``<function
object at 0x...>'''' -- no name, and a type label that is not even a CPython
type.  __name__ and __qualname__ were already correct, so the information was
there; nothing read it.

CPython has FIVE forms and picks by what the callable IS:

    <function modfunc at 0x...>
    <bound method K.meth of <mod.K object at 0x...>>
    <built-in function hash>
    <built-in method append of list object at 0x...>
    <method ''''items'''' of ''''dict'''' objects>

Grail backs all five with three Smalltalk classes, so the form is chosen from
the RECEIVER rather than from the class -- the same split __qualname__ already
made, which is why the two now agree about what a callable is called.

A @staticmethod AND A @classmethod ARE ONE THING AT RUNTIME -- ClassDefAst
compiles both onto the metaclass, so both reach the repr as a callable whose
receiver is the class.  CPython prints them differently, a staticmethod being
bound to nothing and therefore a plain function, and the only thing that still
knows which is which is the COMPILER.  It records the staticmethods in a
class-side ___staticMethodNames___ table, read here.  That was the ninth shape,
and the one that stayed wrong when the other eight were fixed.

A HOSTILE RECEIVER PROPAGATES.  The first draft guarded the receiver''''s repr
and answered ``?''''; CPython does not guard it, and swallowing it would hide
the caller''''s own exception.  Checked against CPython rather than assumed.'
%

doit
CallableReprTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CallableReprTestCase removeAllMethods: 0.
CallableReprTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CallableReprTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'callable_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/callable_repr.py')
		name: 'callable_repr'.
%

category: 'Grail-Helpers'
method: CallableReprTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CallableReprTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: CallableReprTestCase
testAFunctionNamesItself
	"A module-level def, a lambda and a method read through its class are all
	``<function QUALNAME at 0x...>'' -- the name is the point."

	self assertAll: #('a_function_names_itself')
%

category: 'Grail-Tests'
method: CallableReprTestCase
testAStaticMethodIsAPlainFunction
	"The ninth shape.  A @staticmethod is bound to NOTHING, so CPython prints
	it as a function while a @classmethod beside it stays a bound method --
	and the two are indistinguishable at runtime, so the compiler''s
	___staticMethodNames___ table is what separates them.  Asserted INHERITED
	as well, since the table is read along the lookup chain, and with the
	@classmethod cases alongside so the table cannot pass by reclassifying
	every class-side callable."

	self assertAll: #('a_function_names_itself'
		'a_bound_method_names_its_receiver')
%

category: 'Grail-Tests'
method: CallableReprTestCase
testABoundMethodNamesItsReceiver
	"Including a @classmethod, whose receiver is the class, and a callable
	ASSIGNED in a class body, which binds through MethodBinding rather than
	BoundMethod and has to print the same way."

	self assertAll: #('a_bound_method_names_its_receiver')
%

category: 'Grail-Tests'
method: CallableReprTestCase
testTheBuiltinFormsAreNamedToo
	"Three separate CPython spellings -- built-in function, built-in method and
	method descriptor -- told apart by whether there is a receiver and whether
	its type is a builtin."

	self assertAll: #('the_builtin_forms_are_named_too')
%

category: 'Grail-Tests'
method: CallableReprTestCase
testTheReprCarriesTheQualname
	"The repr and __qualname__ must not disagree about what a callable is
	called; they were free to before, because nothing read the name."

	self assertAll: #('the_repr_carries_the_qualname')
%

category: 'Grail-Tests'
method: CallableReprTestCase
testAHostileReceiverPropagates
	"CPython does not guard the receiver''s repr, so neither does this: a
	__repr__ that raises escapes rather than becoming a placeholder."

	self assertAll: #('a_hostile_receiver_propagates')
%
