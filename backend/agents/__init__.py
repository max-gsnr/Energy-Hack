"""SolarTwin O&M agent layer (Rafay).

Consumes Max's exported model payloads and turns them into actionable O&M output:
insight/root-cause findings, forensic inverter timelines, Enerparc-tailored dispatch
emails, and a grounded plant analyst chatbot.

Isolated from `backend/solar_twin/` (the model). Reads only; never mutates model data.
"""
