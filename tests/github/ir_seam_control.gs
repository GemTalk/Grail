! Prove WHICH codegen arm a run really used.
!
! The IR and text arms of the suite score identically when the flag does not
! take effect -- an IR arm that silently fell back to text, or a text arm that
! compiled through IR, is just another green run -- so neither result means
! anything without this.  Import one real stdlib module and read the seam's own
! counters.  ci.yml's test-main runs it after each leg's shards: the ir arm
! (GRAIL_IR_CODEGEN empty, the default since #1087) must answer IRFLAG|true
! with IRCOMPILED > 0, the text arm (GRAIL_IR_CODEGEN=0) IRFLAG|false with
! IRCOMPILED = 0.
!
! Run as:  topaz -lq -S tests/github/ir_seam_control.gs   (finds ./.topazini or ~/.topazini)

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
