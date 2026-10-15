Class {
	#name : 'BuiltinSubclassMethodsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - builtin subclass' }
BuiltinSubclassMethodsTestCase >> testBuiltinSubclassKeepsMethodSuite [
	"``class F(float)'' must still answer is_integer / as_integer_ratio /
	hex, and ``class I(int)'' bit_length.

	The kernel Float/Integer classes are SEALED, so Class.gs substitutes a
	wrapper (AbstractPyFloat / AbstractPyInt) that forwards unknown env-1
	SENDS to the wrapped value through doesNotUnderstand:.  An attribute
	LOAD had no such fallback and raised AttributeError first, so the send
	that would have forwarded cleanly never happened -- the whole builtin
	method suite was unreachable from a subclass, while arithmetic,
	comparison, hash, str/repr and user-defined methods all worked.

	Also pinned: a subclass OVERRIDE still wins over the inherited builtin
	method (the fallback runs only after the normal lookup fails), and a
	genuinely missing attribute still raises AttributeError."

	| mod results |
	importlib @env1:modules removeKey: #'builtin_subclass_methods' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_subclass_methods.py')
		name: 'builtin_subclass_methods'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('float_as_integer_ratio' 'float_is_integer_false' 'float_is_integer_true'
	  'float_hex' 'int_bit_length' 'float_arithmetic' 'float_compare'
	  'float_hash' 'float_str' 'float_isinstance' 'float_type_name'
	  'float_user_method' 'int_arithmetic' 'int_user_method'
	  'subclass_override_wins' 'missing_still_raises') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]

]
