Extension { #name : 'PythonGenerator' }

{ #category : 'Grail-Docstrings' }
PythonGenerator class >> ___methodDocTable___ [
	"CPython 3.14's __doc__ for the generator type's methods and name
	descriptors, transcribed from the running interpreter.  PythonCoroutine
	carries its own table with the coroutine wording."

	^ (KeyValueDictionary @env0:new)
		@env0:at: 'send' put: 'send(value) -> send ''value'' into generator,
return next yielded value or raise StopIteration.';
		@env0:at: 'throw' put: 'throw(value)
throw(type[,value[,tb]])

Raise exception in generator, return next yielded value or raise
StopIteration.
the (type, val, tb) signature is deprecated, 
and may be removed in a future version of Python.';
		@env0:at: 'close' put: 'close() -> raise GeneratorExit inside generator.';
		@env0:at: '__next__' put: 'Implement next(self).';
		@env0:at: '__iter__' put: 'Implement iter(self).';
		@env0:at: '__name__' put: 'name of the generator';
		@env0:at: '__qualname__' put: 'qualified name of the generator';
		yourself

]

{ #category : 'Grail-Finalization' }
PythonGenerator >> ___finalizeAbandoned___ [
	"The destructor of a generator collected while suspended: close it, so the
	GeneratorExit runs its body's cleanup.  The generator is alive again for
	the duration (PEP 442), and stays alive if that cleanup stores it
	somewhere (test_generator_resurrect).

	What close() raises cannot propagate -- this runs at whatever safe point
	the collection reached -- so it goes to sys.unraisablehook with CPython's
	wording: PyErr_FormatUnraisable, the message in err_msg and no object.
	``generator ignored GeneratorExit'' is the usual one, from a body that
	yields again in its handler.

	A generator that finished after the watch was set is quiet: it has
	nothing left to close."

	(started == true and: [done ~~ true]) ifFalse: [^ self].
	[self ___close___]
		@env0:on: AbstractException
		do: [:ex |
			((ex @env0:isKindOf: AlmostOutOfStack)
				or: [ex @env0:isKindOf: AlmostOutOfStackError])
					ifTrue: [ex @env0:pass].
			(sys instance)
				@env1:___callUnraisableHook___: (BaseException @env0:___payloadOf___: ex)
				object: nil
				errMsg: ('Exception ignored while closing generator '
					@env0:, (self ___safeReprOf___: self)).
			ex @env0:return: nil]

]

{ #category : 'Grail-Finalization' }
PythonGenerator >> ___noteFirstSuspension___ [
	"Watch for this generator being dropped while still suspended, so that its
	body's ``finally'' and ``except GeneratorExit'' run, as CPython's destructor
	(_PyGen_Finalize) runs them by closing the generator.

	Registered at the FIRST SUSPENSION and not at creation: a generator that
	never started has no frame to close, and one that runs to completion
	between two resumes never gets here.  The ephemeron is a clean block
	with the generator in its key slot, so the watch does not keep the
	generator alive (FinalizerEphemeron's class section); its hook runs at
	the next safe point after the generator dies -- gc.collect(), or the next
	registration."

	FinalizerEphemeron @env0:on: self
		do: [:aGen :unused | aGen ___finalizeAbandoned___]
		with: nil

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> ___readOnlyGetsetNames___ [
	"See PyGeneratorBase >> ___refuseReadOnlyAttr___:."

	^ #('gi_code' 'gi_frame' 'gi_running' 'gi_suspended' 'gi_yieldfrom')

]

{ #category : 'Grail-Iterator Protocol' }
PythonGenerator >> __iter__ [
	"Generators are their own iterators."

	^ self

]

{ #category : 'Grail-Iterator Protocol' }
PythonGenerator >> __next__ [
	"Advance to the next yield, equivalent to ``send(None)``."

	^ self send: None

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> close [
	"Raise GeneratorExit at the suspended yield; see PyGeneratorBase >>
	___close___."

	^ self ___close___

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> gi_code [
	"Python's ``gen.gi_code'' — the code object of the def whose call made
	this generator."

	^ self ___codeObjectOrSignal___: 'gi_code'

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> gi_frame [
	^ self ___genFrame___

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> gi_running [
	^ self ___genRunning___

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> gi_suspended [
	^ self ___genSuspended___

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> gi_yieldfrom [
	^ self ___genYieldFrom___

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> send: aValue [
	"Resume the body; see PyGeneratorBase >> ___send___:."

	^ self ___send___: aValue

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> throw: anException [
	"Raise anException at the suspended yield; see PyGeneratorBase >>
	___throw___:."

	^ self ___throw___: anException

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> throw: aType _: aValue [
	"The deprecated multi-arg signature -- see ___throwLegacy___:value:."

	^ self ___throwLegacy___: aType value: aValue

]

{ #category : 'Grail-Generator Protocol' }
PythonGenerator >> throw: aType _: aValue _: aTb [
	"The deprecated three-arg signature; see PyGeneratorBase >>
	___throwLegacy___:value:tb:."

	^ self ___throwLegacy___: aType value: aValue tb: aTb

]
