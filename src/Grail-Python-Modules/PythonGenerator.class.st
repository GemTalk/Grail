"What calling a def containing ``yield`` answers: Python's generator.  Only
the generator's own Python API is here -- __iter__, __next__, send, throw,
close and the gi_* attributes; the machinery is PyGeneratorBase's, which
PythonCoroutine and PythonAsyncGenerator share as siblings."
Class {
	#name : 'PythonGenerator',
	#superclass : 'PyGeneratorBase',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
PythonGenerator class >> ___pythonValueAttrs___ [
	"The gi_ introspection surface is VALUES (a bool, a code object, a frame or
	None), so ___pyAttrLoad___ performs these accessors rather than answering a
	BoundMethod that is always truthy.  See PyGeneratorBase."

	^ super ___pythonValueAttrs___
		add: #'gi_running';
		add: #'gi_suspended';
		add: #'gi_code';
		add: #'gi_frame';
		add: #'gi_yieldfrom';
		yourself

]
