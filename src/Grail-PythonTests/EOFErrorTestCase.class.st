Class {
	#name : 'EOFErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-EOFError' }
EOFErrorTestCase >> test_creation [
	"Test creating a EOFError instance."
	
	| exc |
	exc := EOFError ___new___:  EOFError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-EOFError' }
EOFErrorTestCase >> test_inheritance [
	"Test that EOFError inherits from Exception."
	
	| exc |
	exc := EOFError ___new___:  EOFError .
	self assert: (exc isKindOf: Exception).

]
