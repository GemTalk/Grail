Class {
	#name : 'FormatannotationPrintsAForwardRefByNameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FormatannotationPrintsAForwardRefByNameTestCase >> testAForwardRefPrintsAsTheNameItRefersTo [

	"tests/python/formatannotation_prints_a_forward_ref_by_name.py:
	inspect.formatannotation prints an annotationlib.ForwardRef as its
	__forward_arg__, so a dataclass's docstring names an undefined annotation,
	and prints a string bare under quote_annotation_strings=False.  Each check
	agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'formatannotation_prints_a_forward_ref_by_name' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/formatannotation_prints_a_forward_ref_by_name.py')
		name: 'formatannotation_prints_a_forward_ref_by_name'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
