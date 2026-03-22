import pandas as pd
import networkx as nx
from typing import List, Dict, Any

# Aliases for caller/receiver to handle various CSV column naming conventions
CALLER_ALIASES = ['caller', 'caller_id', 'calling_party', 'from', 'a_party', 'calling_number', 'source']
RECEIVER_ALIASES = ['receiver', 'receiver_id', 'called_party', 'to', 'b_party', 'called_number', 'destination']

def _find_col(df: pd.DataFrame, aliases: list) -> str | None:
    """Return the first column name in the df that matches one of the aliases."""
    for a in aliases:
        if a in df.columns:
            return a
    return None

def _cast_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Normalize caller/receiver aliases to standard names
    caller_col = _find_col(df, CALLER_ALIASES)
    receiver_col = _find_col(df, RECEIVER_ALIASES)
    if caller_col and caller_col != 'caller':
        df.rename(columns={caller_col: 'caller'}, inplace=True)
    if receiver_col and receiver_col != 'receiver':
        df.rename(columns={receiver_col: 'receiver'}, inplace=True)
    for col in ['caller', 'receiver', 'tower_id']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.replace(r'\.0$', '', regex=True)
    if 'timestamp' in df.columns and not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    if 'duration' in df.columns:
        df['duration'] = pd.to_numeric(df['duration'], errors='coerce').fillna(0)
    return df

def process_intent(intent: str, target_number: str, direction: str, metric: str, df: pd.DataFrame) -> Dict[str, Any]:
    df = _cast_and_clean(df)
    target_number = str(target_number).strip().replace('.0', '') if target_number else None
    
    if intent == "top_contact":
        return _top_contact(target_number, direction, metric, df)
    elif intent == "call_frequency":
        return _call_frequency(target_number, direction, df)
    elif intent == "tower_location":
        return _tower_location(target_number, df)
    elif intent == "call_duration":
        return _call_duration(target_number, direction, df)
    elif intent == "common_contacts":
        return _common_contacts(df)
    elif intent == "timeline":
        return _timeline(target_number, df)
    elif intent == "unknown":
        return {
            "intent": "unknown",
            "answer": "👋 Hello! I'm ForensicChat — your telecom intelligence assistant.\n\nTry asking:\n• \"Who does 9876543210 call the most?\"\n• \"Show call duration for 111\"\n• \"Tower location history for 555\"\n• \"Call frequency for 9876543210\"",
            "data": [],
            "chart_type": "table",
            "error": None
        }
    else:
        return {"intent": intent, "answer": "", "data": [], "chart_type": "table", "error": f"Unsupported intent: {intent}"}

def _top_contact(target_number: str, direction: str, metric: str, df: pd.DataFrame) -> Dict[str, Any]:
    if 'caller' not in df.columns or 'receiver' not in df.columns or 'duration' not in df.columns:
        return {"intent": "top_contact", "answer": "", "data": [], "chart_type": "bar", "error": "Missing required columns (caller, receiver, duration)"}
        
    if not target_number:
        return {"intent": "top_contact", "answer": "", "data": [], "chart_type": "bar", "error": "No target number specified"}

    if direction == "outgoing":
        filtered = df[df['caller'] == target_number]
        grouper = 'receiver'
    elif direction == "incoming":
        filtered = df[df['receiver'] == target_number]
        grouper = 'caller'
    else: # both
        out_df = df[df['caller'] == target_number].copy()
        out_df['contact'] = out_df['receiver']
        in_df = df[df['receiver'] == target_number].copy()
        in_df['contact'] = in_df['caller']
        filtered = pd.concat([out_df, in_df])
        grouper = 'contact'
        
    if filtered.empty:
        return {"intent": "top_contact", "answer": f"No data found for {target_number}.", "data": [], "chart_type": "bar", "error": None}
        
    grouped = filtered.groupby(grouper).agg(
        call_count=('duration', 'size'),
        total_duration=('duration', 'sum')
    ).reset_index()
    
    if metric == "duration":
        grouped = grouped.sort_values('total_duration', ascending=False)
    else:
        grouped = grouped.sort_values(['call_count', 'total_duration'], ascending=[False, False])
        
    top_row = grouped.iloc[0]
    top_contact_num = top_row[grouper]
    top_count = int(top_row['call_count'])
    top_dur = float(top_row['total_duration'])
    
    dir_str = "calls" if direction == "outgoing" else "is called by" if direction == "incoming" else "interacts with"
    answer = f"{target_number} {dir_str} {top_contact_num} the most with a total duration of {top_dur} seconds ({top_count} call{'s' if top_count != 1 else ''})."
    
    data = grouped.rename(columns={grouper: "receiver" if direction == "outgoing" else "caller" if direction == "incoming" else "contact"}).to_dict('records')
    
    return {
        "intent": "top_contact",
        "answer": answer,
        "data": data[:10],
        "chart_type": "bar",
        "error": None
    }

def _call_frequency(target_number: str, direction: str, df: pd.DataFrame) -> Dict[str, Any]:
    if 'caller' not in df.columns or 'receiver' not in df.columns:
        return {"intent": "call_frequency", "answer": "", "data": [], "chart_type": "bar", "error": "Missing required columns"}
    
    if target_number:
        if direction == "outgoing":
            filtered = df[df['caller'] == target_number]
            counts = filtered['receiver'].value_counts()
        elif direction == "incoming":
            filtered = df[df['receiver'] == target_number]
            counts = filtered['caller'].value_counts()
        else:
            out_c = df[df['caller'] == target_number]['receiver'].value_counts()
            in_c = df[df['receiver'] == target_number]['caller'].value_counts()
            counts = out_c.add(in_c, fill_value=0).sort_values(ascending=False)
            
        return {
            "intent": "call_frequency",
            "answer": f"Found {len(counts)} contacts for {target_number}.",
            "data": [{"contact": str(k), "count": int(v)} for k, v in counts.head(10).items()],
            "chart_type": "bar",
            "error": None
        }
    else:
        # General top callers
        counts = df['caller'].value_counts().head(10)
        return {
            "intent": "call_frequency",
            "answer": f"Here are the top {len(counts)} most active callers in the dataset.",
            "data": [{"caller": str(k), "count": int(v)} for k, v in counts.items()],
            "chart_type": "bar",
            "error": None
        }

def _tower_location(target_number: str, df: pd.DataFrame) -> Dict[str, Any]:
    if 'timestamp' not in df.columns or 'tower_id' not in df.columns:
        return {"intent": "tower_location", "answer": "", "data": [], "chart_type": "table", "error": "Missing timestamp or tower_id"}
        
    if not target_number:
         return {"intent": "tower_location", "answer": "", "data": [], "chart_type": "table", "error": "Target number required"}
         
    user_calls = df[(df['caller'] == target_number) | (df.get('receiver', '') == target_number)].copy()
    user_calls = user_calls.sort_values('timestamp').dropna(subset=['tower_id'])
    
    history = user_calls[['timestamp', 'tower_id']].head(100)
    
    return {
        "intent": "tower_location",
        "answer": f"Found {len(history)} location records for {target_number}.",
        "data": [{"time": str(row['timestamp']), "tower": str(row['tower_id'])} for _, row in history.iterrows()],
        "chart_type": "table",
        "error": None
    }

def _call_duration(target_number: str, direction: str, df: pd.DataFrame) -> Dict[str, Any]:
    if 'duration' not in df.columns:
        return {"intent": "call_duration", "answer": "", "data": [], "chart_type": "table", "error": "Missing duration column"}
        
    if target_number:
        mask = pd.Series([False] * len(df), index=df.index)
        if 'caller' in df.columns:
            mask = mask | (df['caller'] == target_number)
        if 'receiver' in df.columns:
            mask = mask | (df['receiver'] == target_number)
        user_calls = df[mask]
        if len(user_calls) == 0:
            return {"intent": "call_duration", "answer": f"No calls found for {target_number}", "data": [], "chart_type": "table", "error": None}
            
        avg_dur = user_calls['duration'].mean()
        tot_dur = user_calls['duration'].sum()
        max_dur = user_calls['duration'].max()
        
        answer = f"The total call duration for {target_number} is {tot_dur} seconds. (Average: {avg_dur:.1f}s, Max: {max_dur}s)."
        return {
            "intent": "call_duration",
            "answer": answer,
            "data": [
                {"metric": "Average Duration (s)", "value": float(avg_dur)},
                {"metric": "Total Duration (s)", "value": float(tot_dur)},
                {"metric": "Longest Call (s)", "value": float(max_dur)}
            ],
            "chart_type": "table",
            "error": None
        }
    return {"intent": "call_duration", "answer": "", "data": [], "chart_type": "table", "error": "Target number required."}

def _common_contacts(df: pd.DataFrame) -> Dict[str, Any]:
    if 'caller' not in df.columns or 'receiver' not in df.columns:
        return {"intent": "common_contacts", "answer": "", "data": [], "chart_type": "network", "error": "Missing caller or receiver"}
        
    edges_df = df.groupby(['caller', 'receiver']).size().reset_index(name='weight').sort_values('weight', ascending=False).head(300)
    
    G = nx.from_pandas_edgelist(edges_df, 'caller', 'receiver', ['weight'])
    
    nodes = [{"id": str(n), "group": 1} for n in G.nodes()]
    links = [{"source": str(u), "target": str(v), "value": int(d['weight'])} for u, v, d in G.edges(data=True)]
    
    return {
        "intent": "common_contacts",
        "answer": f"Generated connection network with {len(nodes)} entities.",
        "data": [{"nodes": nodes, "links": links}],
        "chart_type": "network",
        "error": None
    }

def _timeline(target_number: str, df: pd.DataFrame) -> Dict[str, Any]:
    if 'timestamp' not in df.columns:
        return {"intent": "timeline", "answer": "", "data": [], "chart_type": "timeline", "error": "Missing timestamp"}
        
    if not target_number:
        user_calls = df.copy()
        msg = "Overall activity timeline."
    else:
        mask = pd.Series([False] * len(df), index=df.index)
        if 'caller' in df.columns:
            mask = mask | (df['caller'] == target_number)
        if 'receiver' in df.columns:
            mask = mask | (df['receiver'] == target_number)
        user_calls = df[mask].copy()
        msg = f"Activity timeline for {target_number}."
        
    daily_counts = user_calls['timestamp'].dt.date.value_counts().sort_index()
    
    return {
        "intent": "timeline",
        "answer": msg,
        "data": [{"date": str(idx), "calls": int(val)} for idx, val in daily_counts.items()],
        "chart_type": "timeline",
        "error": None
    }
