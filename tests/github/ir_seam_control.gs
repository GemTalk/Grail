! Prove the IR seam was actually live in a flag-on run.
!
! A sweep that silently fell back to text scores EXACTLY like the ordinary
! suite, so a green flag-on run means nothing without this.  Import one real
! stdlib module and read the seam's own counters.
!
! Run as:  topaz -lq -S tests/github/ir_seam_control.gs   (finds ./.topazini or ~/.topazini)
! Expects: GRAIL_IR_CODEGEN=1 (or the flag defaulting to on) in the environment.

login
set compile_env: 0
run
| out stats |
out := GsFile stdout.
((Python at: #builtins) @env1:instance) @env1:___import__: { 'textwrap' } kw: nil.
stats := importlib ___irStats___.
out nextPutAll: 'IRFLAG|' , importlib ___irCodegenEnabled___ printString; cr.
out nextPutAll: 'IRSUPPORTED|' , importlib ___irCodegenSupported___ printString; cr.
out nextPutAll: 'IRCOMPILED|' , (stats at: #compiled) printString; cr.
out nextPutAll: 'IRFALLBACKS|' , (stats at: #fallbacks) printString; cr.
^ 'done'
%
logout
exit
