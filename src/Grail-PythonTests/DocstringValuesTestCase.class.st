Class {
	#name : 'DocstringValuesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - Docstrings' }
DocstringValuesTestCase >> testDocstringsReachDunderDocAsCPythonStoresThem [
	"A module-level function's docstring is its __doc__: it compiles to a method
	of the module class, which had no ___methodDocTable___, so every one answered
	None (importlib >> ___loadModuleFromPath___:name: now emits the table).  Every
	docstring is cleaned as CPython 3.13's compiler cleans it -- tabs expanded,
	the first line's leading spaces and the common margin of the rest removed
	(AbstractNode class >> ___cleanDoc___:).  And the LAST def of a name decides,
	so a later undocumented def answers None, in a module or a class -- except
	a property's setter or deleter, which keeps the property's docstring."

	| mod |
	importlib @env1:modules removeKey: #'docstring_values' ifAbsent: [].
	[mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/docstring_values.py')
		name: 'docstring_values'.
	#( 'a_module_function_has_its_docstring'
	   'a_function_without_one_answers_none'
	   'a_decorated_function_keeps_it'
	   'a_decorator_can_rewrite_it'
	   'an_async_function_has_its_docstring'
	   'a_later_def_replaces_it'
	   'an_assignment_wins'
	   'a_method_docstring_is_cleaned'
	   'a_class_docstring_is_cleaned'
	   'a_nested_docstring_is_cleaned'
	   'tabs_are_expanded_first'
	   'a_first_line_loses_its_leading_spaces'
	   'a_redefined_method_has_the_later_docstring'
	   'a_property_setter_keeps_the_getter_docstring'
	   'a_subclass_property_keeps_its_getter_docstring' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'docstring check failed: ' , k , ' -> ' , answer printString]]
		ensure: [
			importlib @env1:modules removeKey: #'docstring_values' ifAbsent: [].
			self ___forgetCanonicalModule___: 'docstring_values']

]
