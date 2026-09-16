## Progress — cut 18 (for loops)

`for target in iter: body` (sync, simple local Name target, no else) reproduces
printSmalltalkOn:'s exception-based loop:

    [[ ___iterN___ := (iter) __iter__.
       [true] whileTrue: [
         [ target := ([___iterN___ __next__]
               @env0:on: StopIteration
               do: [:___dx___ | PythonLoopDrained @env0:___signal___]).
           body...
         ] @env0:on: PythonContinue do: [:___ex___ | nil].
       ].
    ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
    ] @env0:on: PythonBreak do: [:___ex___ | nil].

Only the STEP's own StopIteration means drained (re-signalled as the internal
PythonLoopDrained); one raised by the body sails past to the caller — same
placement as text. Differences from text, both deliberate: the iterator temp is
a METHOD temp (depth-unique `___iterN___`; a user local of that name makes the
def ineligible — text shadows with a block temp), and the `___curPos___`
position stores are omitted (IR derives positions natively; the __iter__ /
__next__ sends are stamped at the iterable's offset instead).

Flow analysis: the loop TARGET is excluded from the statement's reported reads
AND nested writes — its write/read pair is self-contained within an iteration —
but it contributes no binding after the loop (zero-trip leaves it unbound), so
___irLocalWriteTarget___ stays nil and a later read of the target keeps the def
on text. AsyncForAst (a subclass) never qualifies; tuple targets and for-else
stay on text.

Fixture: total_of (accumulate), first_even (return from loop body),
count_pairs (nested loops, distinct iter temps, inner reads outer's target);
compiled 50 -> 53.
