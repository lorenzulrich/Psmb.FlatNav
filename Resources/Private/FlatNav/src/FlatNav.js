import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {$get, $transform} from 'plow-js';
import {Button, Icon, IconButton} from '@neos-project/react-ui-components';
import {connect} from 'react-redux';
import {actions, selectors} from '@neos-project/neos-ui-redux-store';
import {neos} from '@neos-project/neos-ui-decorators';
import HideSelectedNode from './HideSelectedNode';
import DeleteSelectedNode from './DeleteSelectedNode';
import mergeClassNames from 'classnames';
import style from './style.css';
import RefreshNodes from "./RefreshNodes";
@neos(globalRegistry => ({
    nodeTypesRegistry: globalRegistry.get('@neos-project/neos-ui-contentrepository'),
    serverFeedbackHandlers: globalRegistry.get('serverFeedbackHandlers'),
    i18nRegistry: globalRegistry.get('i18n')
}))
@connect($transform({
    nodeData: $get('cr.nodes.byContextPath'),
    focused: $get('ui.pageTree.isFocused'),
    siteNodeContextPath: $get('cr.nodes.siteNode')
}), {
    setSrc: actions.UI.ContentCanvas.setSrc,
    focus: actions.UI.PageTree.focus,
    openNodeCreationDialog: actions.UI.NodeCreationDialog.open,
    commenceNodeCreation: actions.CR.Nodes.commenceCreation,
    selectNodeType: actions.UI.SelectNodeTypeModal.apply,
    merge: actions.CR.Nodes.merge
})
export default class FlatNav extends Component {
    static propTypes = {
        nodes: PropTypes.array.isRequired,
        preset: PropTypes.object.isRequired,
        isLoading: PropTypes.bool.isRequired,
        isLoadingReferenceNodePath: PropTypes.bool.isRequired,
        page: PropTypes.number.isRequired,
        newReferenceNodePath: PropTypes.string.isRequired,
        moreNodesAvailable: PropTypes.bool.isRequired
    };

    componentDidMount() {
        this.populateTheState();
        this.props.serverFeedbackHandlers.set('Neos.Neos.Ui:NodeCreated/DocumentAdded', this.handleNodeWasCreated, 'after Neos.Neos.Ui:NodeCreated/Main');
    }

    componentDidUpdate() {
        this.populateTheState();
    }

    populateTheState = () => {
        if (this.props.nodes.length === 0) {
            if (!this.props.isLoading) {
                this.props.fetchNodes();
            }
            if (!this.props.isLoadingReferenceNodePath) {
                this.props.fetchNewReference();
            }
        }
    };

    handleNodeWasCreated = (feedbackPayload, {store}) => {
        const state = store.getState();

        const getNodeByContextPathSelector = selectors.CR.Nodes.makeGetNodeByContextPathSelector(feedbackPayload.contextPath);
        const node = getNodeByContextPathSelector(state);
        const nodeTypeName = $get('nodeType', node);

        if (nodeTypeName === this.props.preset.newNodeType) {
            this.refreshFlatNav();
        }
    }

    buildNewReferenceNodePath = () => {
        const context = this.props.siteNodeContextPath.split('@')[1];
        return this.props.newReferenceNodePath + '@' + context;
    };

    createNode = () => {
        const contextPath = this.buildNewReferenceNodePath();
        this.props.commenceNodeCreation(contextPath, undefined, 'into', this.props.preset.newNodeType || undefined);
    }

    refreshFlatNav = () => {
        this.props.resetNodes(this.props.fetchNodes);
    }

    renderNodes = () => {
        return this.props.nodes
            .map(contextPath => {
                const item = $get([contextPath], this.props.nodeData);
                if (item) {
                    const nodeTypeName = $get('nodeType', item);
                    const nodeType = this.props.nodeTypesRegistry.getNodeType(nodeTypeName);
                    return (
                        <div
                            className={mergeClassNames({
                                [style.node]: true,
                                [style['node--focused']]: this.props.focused === contextPath
                            })}
                            key={contextPath}
                            onClick={() => {
                                this.props.setSrc($get('uri', item));
                                this.props.focus(contextPath);
                            }}
                            role="button"
                            >
                            <div
                                className={style.node__iconWrapper}>
                                <Icon icon={$get('ui.icon', nodeType)} />
                            </div>
                            <span
                                className={style.node__label}>
                                {$get('label', item)}
                            </span>
                        </div>
                    );
                }
                return null;
            }).filter(i => i);
    };

    render() {
        return (
            <div style={{overflow: 'hidden'}}>
                <div className={style.toolbar}>
                    {!this.props.isLoadingReferenceNodePath && (<IconButton icon="plus" onClick={this.createNode}/>)}
                    <HideSelectedNode/>
                    <DeleteSelectedNode/>
                    <RefreshNodes onClick={this.refreshFlatNav} isLoading={this.props.isLoading}/>
                </div>

                <div className={style.treeWrapper} style={{overflowY: 'auto'}}>
                    {this.renderNodes()}
                </div>
                {!this.props.preset.disablePagination && this.props.moreNodesAvailable && (<Button
                    onClick={this.props.fetchNodes}
                    style="clean"
                    className={style.loadMoreButton}
                    isDisabled={this.props.isLoading}
                >
                    <div style={{textAlign: 'center'}}>
                        <Icon
                            spin={this.props.isLoading}
                            icon={this.props.isLoading ? 'spinner' : 'angle-double-down'}
                        />
                        &nbsp;{this.props.isLoading ? this.props.i18nRegistry.translate('Psmb.FlatNav:Main:loading') : this.props.i18nRegistry.translate('Psmb.FlatNav:Main:loadMore')}
                    </div>
                </Button>)}
            </div>
        );
    }
}
