Class {
	#name : 'HexSeparatorCheckedInCPythonsOrderTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
HexSeparatorCheckedInCPythonsOrderTestCase >> testEachSeparatorAnswersAsCPythonsDoes [

	"tests/python/hex_separator_checked_in_cpythons_order.py: bytes.hex and
	bytearray.hex take the separator's len() first, then refuse a length other
	than 1, anything but a str or a bytes, and a non-ASCII code point.  Each
	check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'hex_separator_checked_in_cpythons_order' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/hex_separator_checked_in_cpythons_order.py'
		name: 'hex_separator_checked_in_cpythons_order'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
