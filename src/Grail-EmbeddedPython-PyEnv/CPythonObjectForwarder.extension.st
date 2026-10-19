Extension { #name : 'CPythonObjectForwarder' }

{ #category : 'Grail-Attribute Access' }
CPythonObjectForwarder >> ___pyAttrLoad___: attributeName [

	^ CPythonObjectForwarder @env0:replicateAttribute: attributeName of: cpythonObject

]

{ #category : 'Grail-Calling' }
CPythonObjectForwarder >> ___pyCallValue___: positional kw: kwargs [
	"Generic Python call protocol: fires when the callee's callability
	isn't known at codegen time ('f = obj.method; f(x)').  The fused
	'recv.attr(args)' form is handled by the DNU dispatcher's call
	branch; this covers the two-step case, which would otherwise hit
	Object's default and raise 'object is not callable'."

	^ self @env0:callWithArguments: positional keywords: kwargs

]

{ #category : 'Grail-Python Protocol' }
CPythonObjectForwarder >> __class__ [
	"type(obj): the underlying Python type (itself a forwarder), not
	the CPythonObjectForwarder Smalltalk class."

	^ self @env0:pythonType

]

{ #category : 'Grail-Python Protocol' }
CPythonObjectForwarder >> __hash__ [

	^ self @env0:pythonHash

]

{ #category : 'Grail-Python Protocol' }
CPythonObjectForwarder >> __repr__ [
	"repr(obj): forward to the underlying PyObject rather than letting
	Object's env-1 default describe the forwarder itself."

	^ self @env0:pythonRepresentation

]

{ #category : 'Grail-Python Protocol' }
CPythonObjectForwarder >> __str__ [

	^ self @env0:pythonString

]

{ #category : 'Grail-Calling' }
CPythonObjectForwarder >> value: positionalArguments value: keywordArguments [

	^ self
		@env0:callWithArguments: positionalArguments
		keywords: keywordArguments

]
