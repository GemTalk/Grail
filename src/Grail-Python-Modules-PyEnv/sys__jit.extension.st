Extension { #name : 'sys__jit' }

{ #category : 'Grail-Initialization' }
sys__jit >> initialize [
	self @env0:at: #__doc__ put: 'Utilities for observing just-in-time compilation.'

]

{ #category : 'Grail-Built-in Functions' }
sys__jit >> is_active [
	"Is the topmost frame running JIT code?  Never, with no JIT to run it."

	^ false

]

{ #category : 'Grail-Built-in Functions' }
sys__jit >> is_available [
	"Does this interpreter support JIT compilation?  CPython answers False
	for a build without _Py_TIER2; Grail has none to build in."

	^ false

]

{ #category : 'Grail-Built-in Functions' }
sys__jit >> is_enabled [
	"Is JIT compilation on for this process?  Not without one available."

	^ false

]
