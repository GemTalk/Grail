Class {
	#name : 'TypeError',
	#superclass : 'Exception',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Arity Checks' }
TypeError class >> ___grailCheckMultipleValues___: names pos: positional kw: keywords skip: skip name: qualname [
	"CPython's ``got multiple values for argument'' check for one call (#1477):
	names holds the call site's positional-OR-keyword parameters in order,
	the first of them at positional index skip + 1, and one bound positionally
	must not also arrive in keywords.  Signals for the first such name, in
	parameter order; answers nil otherwise.

	A METHOD rather than code emitted at each def, for two reasons.  A def
	can declare hundreds of parameters -- test_call's TestFunctionWithManyArgs
	builds one with 1000 -- and a check per parameter made such a method too
	large to run.  And an emitted LOOP would be a block reading the
	positional Array and the keyword dict, which on the IR arm moves both
	into a context the def's other blocks share: a generator's body then
	kept every argument alive for the generator's life
	(test_contextlib's test_nokeepref).  Passed here as arguments, they are
	captured by nothing.  Called only when the call passed keywords."

	| n param |
	n := (positional size - skip) min: names size.
	1 to: n do: [:i |
		param := names at: i.
		(keywords includesKey: param) ifTrue: [
			^ self @env1:___signal___: qualname , '() got multiple values for argument ''' , param , '''']].
	^ nil

]
