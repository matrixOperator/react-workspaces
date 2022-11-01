import * as React from 'react';
import styled from '@emotion/styled';
import { GenerateEvent, WorkspaceNodeModel, WorkspaceTrayFactory } from '@projectstorm/react-workspaces-core';

namespace S {
	export const Tray = styled.div`
		height: 15px;
		background: mediumpurple;
	`;
}

export class DefaultTrayFactory extends WorkspaceTrayFactory {
	generateTrayHeader(event: GenerateEvent<WorkspaceNodeModel>): JSX.Element {
		return (
			<S.Tray
				onDoubleClick={() => {
					event.model.setMode(event.model.mode === 'micro' ? 'expand' : 'micro');
				}}
			/>
		);
	}
}
