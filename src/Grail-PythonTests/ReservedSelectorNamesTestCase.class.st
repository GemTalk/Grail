Class {
	#name : 'ReservedSelectorNamesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - Class Body' }
ReservedSelectorNamesTestCase >> testABindingNamedLikeAReservedSelectorWorks [
	"Grail compiles a class body's def or attribute, and a module's def, as
	methods named after it, and the compiler refuses the selectors it inlines
	(repeat, whileTrue, ifTrue:, ...) and those with a special bytecode
	(isNil, yourself, isKindOf:, _isInteger, ...).  numpy.ma's MaskedArray has
	``repeat = _arraymethod('repeat')'', so the class failed to define and
	took np.unique and np.percentile with it.  The parser now puts such a
	binding under a synthetic ``if True:'' (ModuleAst class >>
	___wrapReservedSelectorBindingsIn___:), the conditional path that compiles
	nothing named after it; ast.parse does not see the wrapper."

	| mod |
	importlib @env1:modules removeKey: #'reserved_selector_names' ifAbsent: [].
	[mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reserved_selector_names.py')
		name: 'reserved_selector_names'.
	#( 'a_class_attribute_method_binds'
	   'a_class_attribute_reads'
	   'reserved_defs_call'
	   'an_override_reaches_super'
	   'the_names_are_in_the_class_dict'
	   'a_class_attribute_rebinds'
	   'a_module_def_calls'
	   'a_class_in_a_function'
	   'ast_parse_shows_the_source' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'reserved-selector check failed: ' , k , ' -> '
				, answer printString]]
		ensure: [
			importlib @env1:modules removeKey: #'reserved_selector_names' ifAbsent: [].
			self ___forgetCanonicalModule___: 'reserved_selector_names']

]
