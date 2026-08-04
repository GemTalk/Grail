"probe_shim_foreign_dict.gs

Demonstrates the two SECOND-ORDER defects behind the reported pair
    a ShimForeignObject does not understand #'includesKey:'
    IndexError: no such group
WITHOUT depending on GC/sweep timing.  Full chain:
docs/Shim_Foreign_Proxy_Misattribution.md

Run (pipe on STDIN -- evaluate.sh supplies the run/% wrapper itself, and reading
stdin keeps the shell from expanding the $: character literal below):

    source ./.setenv && ./scripts/evaluate.sh < scripts/probe_shim_foreign_dict.gs
"
| shim proxy r txt idx name cls out |
out := GsFile stdout.

shim := CPythonShim current.
proxy := ShimForeignObject new.
proxy setCPtr: 16r7F0000001234 typeName: 'numpy.dtype'.

out nextPutAll: '=== DEFECT 1 ==================================================', Character lf asString.
out nextPutAll: 'CPythonShim>>PyDict_GetItem:key: assumes a Smalltalk dictionary and', Character lf asString.
out nextPutAll: 'sends #includesKey: with no type guard.  Given the reverse proxy:', Character lf asString.
r := [shim PyDict_GetItem: proxy key: 'num']
	on: MessageNotUnderstood
	do: [:ex | 'MNU: ' , ex messageText].
out nextPutAll: '  ' , r printString, Character lf asString.
out nextPutAll: 'PyDict_Contains:key:, PyDict_DelItem:key: and PyDict_Size: on the', Character lf asString.
out nextPutAll: 'next three lines of that file share the same assumption:', Character lf asString.
r := [shim PyDict_Contains: proxy key: 'num']
	on: MessageNotUnderstood do: [:ex | 'MNU: ' , ex messageText].
out nextPutAll: '  ' , r printString, Character lf asString.
r := [shim PyDict_Size: proxy]
	on: MessageNotUnderstood do: [:ex | 'MNU: ' , ex messageText].
out nextPutAll: '  ' , r printString, Character lf asString.

out nextPutAll: Character lf asString.
out nextPutAll: '=== DEFECT 2 ==================================================', Character lf asString.
out nextPutAll: '___translateShimError: finds the exception name by locating the FIRST', Character lf asString.
out nextPutAll: 'colon.  In an MNU''s messageText that colon is inside the SELECTOR, so', Character lf asString.
out nextPutAll: 'the parse yields garbage, resolves to nil, and the error is passed', Character lf asString.
out nextPutAll: 'unchanged out of a C user-action callback:', Character lf asString.
txt := 'a MessageNotUnderstood occurred (error 2010), a ShimForeignObject does not understand  #''includesKey:'''.
idx := txt indexOf: $:.
name := txt copyFrom: 1 to: idx - 1.
cls := Python at: name asSymbol otherwise: nil.
out nextPutAll: '  first colon index : ' , idx printString, Character lf asString.
out nextPutAll: '  parsed exc name   : ' , name printString, Character lf asString.
out nextPutAll: '  Python at: name   : ' , cls printString
	, '   -> takes ^ ex pass', Character lf asString.

out nextPutAll: Character lf asString.
out nextPutAll: '=== CONSEQUENCE ===============================================', Character lf asString.
out nextPutAll: 'No CPython-level PyErr is ever set, so back in _sre''s match_getindex', Character lf asString.
out nextPutAll: '(src/c/shim/_sre/sre.c:2352) the group index is still -1 and', Character lf asString.
out nextPutAll: '  if (!PyErr_Occurred()) PyErr_SetString(PyExc_IndexError, "no such group");', Character lf asString.
out nextPutAll: 'stamps its own generic error on top.  THAT is what the test reports --', Character lf asString.
out nextPutAll: 'two subsystems away from the actual defect.', Character lf asString.
'probe done'
