Extension { #name : 'SystemExit' }

{ #category : 'Grail-Accessing' }
SystemExit >> code [
	"The exit status: CPython's only SystemExit-specific attribute, and what
	sys.exit()'s whole contract is expressed through.  An int is the process
	status, None and 0 both mean success, and a str is a message for stderr.
	Anything that catches SystemExit to decide what happens next reads it --
	``sys.exit(main())'' wrappers, unittest's runner, and test_zipapp's four
	CLI tests, which assert on ``cm.exception.code'' directly.

	CPython's SystemExit_init is the rule, and it is a rule about ARGS:

	    len(args) == 0  ->  None            (the slot is never assigned)
	    len(args) == 1  ->  args[0]
	    len(args) >  1  ->  args            (the whole tuple)

	Grail had the attribute nowhere -- ``SystemExit(1).code'' raised
	AttributeError -- while the class DECLARED a ``code'' instVar that no path
	ever assigned, so the slot could only ever have read nil.  Deriving from
	args instead of filling that slot is what makes this hold for the raise
	paths too: ``sys.exit(3)'', ``raise SystemExit(3)'' and ``SystemExit(3)''
	construct three different ways and all three set args, none of them an
	instVar.  The instVar is gone with this method; a declared slot nothing
	writes is not a smaller bug than a missing attribute, it is the same one
	with somewhere to hide.

	Note what the 0-argument case is NOT: it is not ``args[0] if it happens to
	be None''.  ``SystemExit(None)'' has args ``(None,)'' and code None, and
	``SystemExit()'' has args ``()'' and code None -- the same code from
	different args, which is why the length is what gets tested and not the
	value.

	An explicit ``e.code = 3'' needs no setter: the store lands in
	dynamic-instVar storage, which ___pyAttrLoad___ probes (Phase B) BEFORE the
	value-attribute hook, so the assignment shadows this derivation -- and,
	matching CPython's plain writable member, leaves args alone."

	| a n |
	a := self args.
	n := a @env0:size.
	(n @env0:= 0) ifTrue: [^ None].
	(n @env0:= 1) ifTrue: [^ a @env0:at: 1].
	^ a

]
