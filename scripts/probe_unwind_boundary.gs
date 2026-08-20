"probe_unwind_boundary.gs

Reproduction script for GemStone_Feature_Requests 1.5 -- unwind across
user-action and C-primitive frames.  Errors 2758 (ERR_EXC_RETURN_DISALLOWED)
and 2079 (RT_ERR_CANT_RETURN).

THE CLAIM.  An exception handler that RETURNS (ex return:, or a Smalltalk ^ from
the handler block) cannot unwind across certain frames.  When it tries, the
recoverable exception is replaced by a NON-RECOVERABLE one: 2758, or CannotReturn
-> UncontinuableError 6011, which takes the whole session with it.  That is the
amplification this ask is about: a bug that would have been a catchable
MessageNotUnderstood or AttributeError becomes a lost session.

PART 1 IS A NEGATIVE CONTROL, and its result is the useful half of this script:
the BASE IMAGE DOES NOT REPRODUCE IT.  Five shapes where a block is called from a
kernel method and raises -- sort:, detect:, do:, collect:, perform: -- all unwind
correctly, as does a raise from an ensure: during unwind and a dictionary
iteration callback.  So the refusal is NOT a property of ordinary block callbacks
or of perform:, and there is nothing to fix in those.

PART 2 drives real USER ACTIONS -- C functions declared with GCI_DECLARE_ACTION
that call back into Smalltalk (GciPerform / GciExecute).  Grail's CPython shim is
one: src/c/shim/cpython.cc declares nine actions and calls back from 97 sites.
``CPythonShim current'' loads the library, which ./install.sh has already built at
src/c/shim/libcpython_ua.dylib (NOT lib/ -- an earlier version of this script
looked there and wrongly reported the shim missing).

AND PART 2 DOES NOT REPRODUCE IT EITHER, which is the point of running it.  Two
routes were tried: shimWrapProbe over three argument shapes (returns 0, no
callback raise), and shimLoadModule on a .py module whose BODY raises -- so the
raise happens in Smalltalk with a user-action frame on the stack, which is exactly
the documented shape.  The handler outside recovered normally.  Twelve shapes in
total, no 2758.  So the refusal needs something narrower than ``a user action with
a Smalltalk callback that raises'': on the evidence here it needs the numpy/PyInit
frontier that 1.5's own citation points at (docs/Shim_NumPy.md:46-90).

Run (pipe on STDIN, so evaluate.sh supplies the run/% wrapper):

    source ./.setenv && ./scripts/evaluate.sh < scripts/probe_unwind_boundary.gs
"
| out shapes loaded r |
out := GsFile stdout.
out nextPutAll: '=== PART 1: kernel shapes (negative control) ==================='; lf.

"Each shape: a block raises somewhere under a kernel method, and the handler
 RETURNS a value.  #handled means the unwind was permitted."
shapes := OrderedCollection new.
shapes add: 'sort: block raises' ->
	[[(Array with: 3 with: 1 with: 2) sort: [:a :b | Error signal: 'boom']]
		on: Error do: [:ex | ex return: #handled]].
shapes add: 'detect: block raises' ->
	[[(Array with: 1 with: 2) detect: [:x | Error signal: 'boom']]
		on: Error do: [:ex | ex return: #handled]].
shapes add: 'do: block raises' ->
	[[(Array with: 1 with: 2) do: [:x | Error signal: 'boom']]
		on: Error do: [:ex | ex return: #handled]].
shapes add: 'collect: block raises' ->
	[[(Array with: 3) collect: [:x | Error signal: 'boom']]
		on: Error do: [:ex | ex return: #handled]].
shapes add: 'perform: raises' ->
	[[3 perform: #error: with: 'boom']
		on: Error do: [:ex | ex return: #handled]].
shapes add: 'perform:env: raises' ->
	[[3 perform: #error: with: 'boom' env: 1]
		on: Error do: [:ex | ex return: #handled]].
shapes add: 'raise from ensure: during unwind' ->
	[[[Error signal: 'inner'] ensure: [Error signal: 'from ensure']]
		on: Error do: [:ex | ex return: #handled]].
shapes add: 'dictionary iteration callback raises' ->
	[[ | d | d := KeyValueDictionary new.
	   d at: (Array with: 1) put: 2.
	   d keysAndValuesDo: [:k :v | Error signal: 'boom']]
		on: Error do: [:ex | ex return: #handled]].

shapes do: [:pair |
	| answer |
	"on: Error round the WHOLE thing so a shape that refuses the unwind is
	 reported rather than ending the script -- if the refusal is 6011 it will end
	 it anyway, which is itself the finding."
	answer := [pair value value] on: AbstractException do: [:e |
		'REFUSED -> ' , e class name asString , ' ' , (e messageText ifNil: [''])].
	out nextPutAll: ((answer = #handled) ifTrue: ['  unwound  '] ifFalse: ['  REFUSED  ']);
	    nextPutAll: pair key;
	    nextPutAll: ((answer = #handled) ifTrue: [''] ifFalse: ['  ' , answer printString]);
	    lf].

out nextPutAll: 'Expected on a healthy base image: every line "unwound".'; lf; lf.

out nextPutAll: '=== PART 2: user-action frame (the actual defect) =============='; lf.
loaded := System userActionReport keys size > 0.
out nextPutAll: 'user actions loaded in this gem: ';
    nextPutAll: System userActionReport keys asSortedCollection asArray printString; lf.
loaded
	ifFalse: [
		out nextPutAll: 'NONE -- send ``CPythonShim current'' first to load them'; lf.
		out nextPutAll: '(./install.sh builds src/c/shim/libcpython_ua.dylib).'; lf.
		out nextPutAll: 'Grail occurrences of the shape:'; lf.
		out nextPutAll: '    src/smalltalk/Python/CPythonShim.gs:939, :1029, :1304'; lf.
		out nextPutAll: '    src/smalltalk/Python/Object.gs:7546-7550'; lf; lf.
		out nextPutAll: 'THE SHAPE, in Smalltalk terms:'; lf.
		out nextPutAll: '    [ <user action> --calls back--> Smalltalk method --raises--> ]'; lf.
		out nextPutAll: '        on: Error do: [:ex | ex return: #recovered]'; lf.
		out nextPutAll: 'The raise is recoverable; the RETURN across the user-action frame'; lf.
		out nextPutAll: 'is what is refused, so 2758 replaces it.  Grail hits this when'; lf.
		out nextPutAll: 'env-1 lazy init runs inside the PyInit user action, and hits the'; lf.
		out nextPutAll: 'C-primitive twin when __getattr__ recursion overflows: the'; lf.
		out nextPutAll: 'Python ``return'''' in an ``except RecursionError'''' clause cannot'; lf.
		out nextPutAll: 'cross the doesNotUnderstand: primitive frames, giving'; lf.
		out nextPutAll: 'CannotReturn -> UncontinuableError 6011, session-fatal.'; lf]
	ifTrue: [
		out nextPutAll: 'Shim present.  Route 1: shimWrapProbe(Object new, 1)'; lf.
		r := [System userAction: #shimWrapProbe with: Object new with: 1]
			on: AbstractException do: [:ex | ex return: 'REFUSED -> ' , ex class name asString].
		out nextPutAll: '  -> '; nextPutAll: r printString;
		    nextPutAll: '   (a plain answer means the action did not call back)'; lf.
		out nextPutAll: 'Route 2 needs a .py module whose body raises on the import'; lf.
		out nextPutAll: 'search path; see the script header for the measured result'; lf.
		out nextPutAll: '(the handler outside recovered -- no 2758).'; lf].
out nextPutAll: 'ASK: permit the unwind, or make the refusal catchable and'; lf.
out nextPutAll: 'distinguishable so it can be translated rather than cascading.'; lf.
'probe complete'
